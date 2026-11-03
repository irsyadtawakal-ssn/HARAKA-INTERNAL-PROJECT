# Tab Pembuatan Konten — AI Video Otomatis dari Referensi

Dokumen desain · 3 November 2026 · status: draft hasil sesi grilling, untuk disetujui

## 1. Maksud

Si boss ingin tim cukup memasukkan **referensi gambar atau video**, lalu sistem membuat **video iklan jadi** secara otomatis dengan AI. Tab ini menjadi halaman `/konten` di aplikasi `frontend/` (bukan mockup `content_studio` di `HOMEPAGE/app/dashboard`).

## 2. Perubahan terhadap PRD

PRD §3.3 menyebut "AI mengedit atau membuat video" sebagai **non-tujuan MVP**. Desain ini membatalkan poin itu: AI **membuat klip video** (Google Flow / Veo) dan sistem **merakitnya** (Remotion). PRD perlu direvisi dan disetujui boss.

Prinsip PRD yang tetap berlaku:
- Klaim hanya dari Claims Library (K-02); klaim baru wajib approval.
- AI hanya mengisi data template, tidak menulis kode bebas (semangat L-01).
- Aset berlisensi `unknown` tidak boleh dipakai di konten publik (A-03).
- Semua panggilan AI tercatat di `agent_runs`; tindakan berisiko lewat `approvals`.

## 3. Alur

```
1 Upload referensi + pilih tipe          (manusia)
2 AI analisis referensi                   (otomatis)
3 AI tulis script, prompt Flow, JSON      (otomatis)
4 Gerbang 1: cek klaim                    (aman → lanjut; klaim baru → approval)
5 Render klip mentah di Google Flow       (otomatis, extension di VPS)
6 Komposisi Remotion                      (otomatis)
7 Gerbang 2: review video                 (manusia) → aset siap LP / Meta Ads
```

### 3.1 Referensi

| Referensi | Dipakai sebagai | Mode Flow |
|---|---|---|
| Foto orang | Talking head yang mengucapkan dialog | Frames, start = foto |
| Foto produk/pabrik | B-roll tanpa dialog | Frames, start = foto |
| Video | Inspirasi (hook, gaya, tempo) + 1 frame terbaik jadi start frame | Video tidak dikirim ke Flow |

Jenis referensi dideteksi dari analisis aset (`footage_type`) dan bisa dikoreksi user. Foto orang wajib berlisensi `testimonial_consented` atau `creator_licensed`.

### 3.2 Tipe konten

| Tipe | Durasi | Isi |
|---|---|---|
| Video Ads | 15–30 dtk | Hook → B-roll produk/pabrik → CTA, teks overlay kuat |
| Talking Head | 15–30 dtk | Avatar bicara (hook + body + CTA), subtitle, B-roll sisipan |
| Hard Sell | maks 15 dtk | Tawaran/promo langsung, harga/MOQ, CTA WA besar |

Setiap tipe = satu template Remotion.

### 3.3 Satuan kerja dan kuota

- Satu Generate = satu konsep = **3 variasi hook** dengan body dan CTA dipakai bersama.
  - Ads / Talking Head: 3 hook + 1 body + 1 CTA = 5 klip → 3 video.
  - Hard Sell: 3 hook + 1 CTA = 4 klip → 3 video.
- `guardrail_settings.flow_daily_clip_limit` awal **30 klip/hari**; lewat batas, job antri ke hari berikutnya. Angka disesuaikan dengan kuota langganan Flow.
- Render ulang per klip tersedia dan dihitung ke kuota.
- `/konten` menampilkan sisa kuota hari ini.

### 3.4 Gerbang approval

- **Gerbang 1 (sebelum render):** dialog dicek terhadap Claims Library. Semua klaim terdaftar → render jalan otomatis. Ada klaim baru → approval `claim`; sementara itu AI membuat **versi alternatif tanpa klaim baru** yang bisa dirender langsung.
- **Pengecekan otomatis sesudah render:** worker mentranskrip audio klip (C-01) dan membandingkannya dengan dialog. Selisih besar → render ulang otomatis. Klip B-roll dilewati.
- **Gerbang 2 (sesudah komposisi):** review visual (wajah, sinkron bibir, teks) sebelum video boleh dipakai di LP / iklan (`publish_lp`, `activate_ad`).

### 3.5 Peran

Selama pilot **semua aksi dipegang `owner`**. Pengecekan peran tetap dipasang per aksi sejak awal supaya pembukaan akses ke `marketing`/`creator` nanti cukup lewat konfigurasi:

| Aksi | Target setelah pilot |
|---|---|
| Upload + Generate | `marketing`, `owner` |
| Upload saja | `creator` |
| Approve klaim baru (gerbang 1) | `owner` |
| Review video (gerbang 2) | `marketing` |
| Ubah kuota & setting LLM | `owner` |
| Lihat hasil | semua peran |

## 4. Komponen

### 4.1 LLM (langkah 2 dan 3)

- Provider bisa diganti; default memakai endpoint OpenAI-compatible yang sudah ada (pola `LLM_BASE_URL` / `model` / `apiKey` seperti Rara).
- Dua slot model: `analysis_model` (analisis referensi) dan `writer_model` (script, prompt Flow, JSON template).
- Analisis video **tidak** mengirim file video ke LLM: FFmpeg mengambil frame kunci + transkrip, sehingga model vision apa pun bisa dipakai.
- Keluaran langkah 3: script per slot, prompt Flow (bahasa Inggris, dialog dalam tanda kutip), dan JSON data template Remotion.

### 4.2 Render: Google Flow lewat extension

- Sumber: `frontend/google-flow-autopilot/` dipindah ke folder `flow-extension/` di monorepo; versi project "AI VIDIO OTOMATIS" tidak disentuh.
- Dijalankan oleh Google Chrome non-headless di **VPS Factory 8 GB** (terpisah dari VPS WA), lewat desktop virtual + VNC. Extension dipasang sekali via *Load unpacked*; update = `git pull` + reload.
- Chrome dibatasi memorinya (±3 GB) dan direstart otomatis tiap hari. Akun Google khusus render, bukan akun utama bisnis.
- Uji coba seminggu: catat rasio sukses/gagal/captcha dari `render_jobs` + `audit_logs` (render tidak memakai LLM, jadi bukan `agent_runs`). Jika buruk, pindah ke mini PC kantor. Captcha tidak diakali dengan solver.

Perubahan pada extension:
1. Ganti 6 alamat `localhost:3210` dengan satu setting `backendUrl` + token device; semua request lewat `background.js`.
2. Antrian berbasis klaim: `POST /flow-jobs/claim` mengunci satu job; extension melapor status berkala; tanpa kabar 15 menit → job dikembalikan ke antrian.
3. Mode B-roll tanpa dialog (durasi tidak dihitung dari kata).
4. Status per langkah ke backend (`claimed`, `uploading_ref`, `generating`, `downloading`, `done`, `failed: <alasan>`).
5. Ganti persona/nama file bawaan ("Rafi", `Flow_Rafi_*`).

Satu job berjalan dalam satu waktu (satu tab Flow).

### 4.3 Pengembalian file video

- **Jalur utama:** Chrome mengunduh 720p lewat menu Flow ke folder unduhan khusus di VPS. Worker memantau folder itu; karena hanya satu job aktif, file baru dipasangkan ke job yang sedang diklaim, diunggah ke S3, dan dicatat sebagai aset (`parent_asset_id` = referensi, lisensi `internal`).
- **Jalur cadangan:** extension mengambil blob video di halaman dan mengunggahnya ke presigned URL (jalur "fallback B" yang sudah ada). Resolusi dicatat; bila bukan 720p, ditandai.
- Bila mesin render dipindah dari VPS, jalur cadangan menjadi jalur utama.

### 4.4 Komposisi: Remotion

- Satu template per tipe konten; AI hanya mengisi props JSON (urutan klip, teks hook, subtitle, warna brand, logo, end card CTA).
- Suara: audio asli Flow untuk talking head; B-roll diberi musik latar bebas lisensi; tanpa TTS di MVP.
- Render satu job dalam satu waktu dengan batas memori sendiri (Chrome kedua di VPS).
- Hasil: video 9:16 per variasi hook; klip mentah tetap bisa diunduh.
- Lisensi: cek ketentuan Remotion terhadap entitas yang memakai (Haraka Erfi), bukan jumlah developer.

### 4.5 Data

Memakai tabel yang ada (`assets`, `asset_analysis`, `scripts`, `agent_runs`, `approvals`, `guardrail_settings`, `audit_logs`). Tambahan yang diperlukan:
- `content_jobs`: satu Generate (tipe, funnel, referensi, status keseluruhan).
- `render_jobs`: satu klip Flow (slot, prompt, status, percobaan, klaim oleh device, asset hasil).
- `compositions`: satu video jadi (template, props JSON, klip yang dipakai, asset hasil, status review).
- `render_devices`: token device untuk extension.

## 5. Risiko yang diterima

| Risiko | Mitigasi |
|---|---|
| Otomasi UI Flow melanggar ToS / akun diblokir | Akun khusus render; volume dibatasi kuota harian; siap beralih ke Veo API |
| Selector Flow rusak saat Google update UI | Status `failed` dengan alasan jelas; perbaikan selector terpusat di `flow-extension/` |
| IP datacenter memicu captcha | Uji coba seminggu; pindah ke mini PC kantor |
| Video AI menampilkan hal yang tidak nyata | Pabrik/produk hanya dari foto asli sebagai start frame; gerbang 2 |
| Biaya kredit membengkak (`x2`) | Kuota harian, render ulang per klip |

## 6. Belum diputuskan

- Kuota Flow langganan yang sebenarnya (menentukan `flow_daily_clip_limit`).
- Isi aset brand untuk template: logo, font, palet, library musik.
- Revisi PRD §3.3 oleh boss.
