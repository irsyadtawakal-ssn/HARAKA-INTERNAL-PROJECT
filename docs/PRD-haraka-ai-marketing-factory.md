# PRD — Haraka Erfi AI Marketing Factory

| | |
|---|---|
| **Versi** | 1.0 (draft) — 29 Oktober 2026 |
| **Sumber** | *Haraka Erfi AI Marketing Factory — Blueprint Programmer v1.0 (Oktober 2026)* |
| **Status** | Draft untuk review Owner/Project Leader |
| **Pemilik dokumen** | Project Leader Haraka Erfi |
| **Pembaca** | Programmer backend/AI, programmer frontend, tim marketing, Admin Ads, Sales |

> Penanda di dokumen ini:
> **[BP]** = berasal langsung dari blueprint.
> **[TAMBAHAN]** = usulan PRD untuk menutup celah di blueprint; perlu disetujui.
> **[TBD]** = keputusan atau angka yang harus diisi Owner/tim sebelum atau saat development.

---

## 1. Ringkasan

Haraka Erfi adalah bisnis jasa **maklon/manufaktur kosmetik B2B**. Saat ini mereka sudah punya **AI WhatsApp** (auto-reply CS, lihat kondisi aktual di §7.6) dan **AI Ads** (Meta). Yang belum ada adalah lapisan di tengah: tempat mengolah aset kreatif menjadi campaign, membuat landing page, dan mengaitkan semuanya ke hasil penjualan.

**AI Marketing Factory** adalah sistem internal dengan alur:

> **Upload → AI meramu → review manusia → tayang → baca hasil → usulkan perbaikan → ulang.**

Tim cukup mengunggah video, foto, dan materi promosi. Setelah itu AI:

1. memberi tag dan menganalisis aset,
2. menyusun script dan brief konten,
3. membuat landing page dari template,
4. menyiapkan draft iklan Meta,
5. mengaitkan lead ke WhatsApp,
6. membaca performa dan kualitas lead, lalu mengusulkan optimasi.

Manusia tetap memegang keputusan atas **budget, klaim, publikasi, dan tindakan berisiko**.

---

## 2. Latar Belakang & Masalah

| Masalah sekarang | Dampak |
|---|---|
| Video/foto yang sudah ada tidak dikelola terpusat dan belum pernah dianalisis | Aset bagus tidak dipakai ulang, dan campaign baru selalu dimulai dari nol |
| Copy, brief kreator, dan landing page dibuat manual | Lambat, sulit membuat variasi per audiens, A/B test jarang dilakukan |
| AI Ads dan AI WhatsApp berjalan terpisah | Optimasi iklan mengejar klik/lead murah, bukan **qualified lead** atau **deal** |
| Tracking (pixel, UTM, CAPI) belum terbukti benar | Budget bisa dinaikkan berdasarkan data yang salah |
| Belum ada pagar keamanan untuk otomasi | Ada risiko klaim tidak terverifikasi, budget bocor, dan spam WhatsApp |

---

## 3. Tujuan & Non-Tujuan

### 3.1 Tujuan bisnis
- **G1.** Memperpendek waktu dari "aset diunggah" sampai "campaign siap tayang" (target: [TBD] hari, versus kondisi sekarang [TBD]).
- **G2.** Mengoptimasi iklan berdasarkan **cost per qualified lead** dan deal, bukan CPL saja.
- **G3.** Memisahkan dan mengukur dua funnel (brand pemula vs owner brand existing) secara terpisah.
- **G4.** Semua tindakan AI dapat diaudit, butuh approval untuk hal berisiko, dan bisa dibatalkan.

### 3.2 Tujuan produk (terukur)
| ID | Metrik | Target MVP |
|---|---|---|
| P1 | Aset yang dianalisis otomatis tanpa error | ≥ 95% |
| P2 | Waktu dari upload sampai brief/script draft siap | ≤ [TBD, usulan 30 menit] |
| P3 | Lead dari LP yang tercocokkan ke record lead di sistem WA | ≥ 95% |
| P4 | Event pixel (PageView, Lead, Contact) lolos QA sebelum publish | 100% halaman publik |
| P5 | Tindakan berisiko yang tayang tanpa approval | 0 |

### 3.3 Non-tujuan (di luar scope MVP)
- **Membangun ulang AI WhatsApp** — sistem yang sudah ada diintegrasikan dan diberi fitur lead seperlunya (§7.6.2), bukan ditulis ulang. [BP]
- TikTok Ads dan Google Ads (dikerjakan setelah fase Meta stabil). [BP]
- **AI mengedit atau membuat video.** AI menghasilkan script, shot list, dan brief untuk editor/kreator. [TAMBAHAN — klarifikasi]
- Mengubah budget iklan secara otomatis di atas batas tanpa approval.
- Membangun CMS penuh atau mendesain ulang harakaerfi.com.
- Menyalin isi percakapan WhatsApp pribadi ke platform iklan. [BP]

---

## 4. Pengguna & Peran

| Peran | Kebutuhan utama | Hak akses (RBAC) |
|---|---|---|
| **Owner / Project Leader** | Menetapkan target, batas biaya, penawaran; memutuskan scale | Semua; approver akhir untuk budget & klaim |
| **Marketing** | Upload aset, review script/LP, minta variasi | CRUD aset, script, LP draft; mengajukan approval |
| **Kreator / Editor** | Upload footage, menerima brief | Upload aset, melihat brief miliknya |
| **Admin Ads** | QA pixel/event, review campaign & budget | Kelola tracking config, draft campaign; approver aktivasi iklan |
| **Sales** | Mendefinisikan qualified lead, memberi feedback loss | Melihat lead & status; mengisi alasan loss, nilai quotation/deal |
| **Viewer** | Melihat dashboard | Read-only |

[TAMBAHAN] Setiap jenis approval punya **PIC** yang ditetapkan di pengaturan (lihat §10).

---

## 5. Dua Funnel (wajib terpisah) [BP]

| | **Funnel A — Calon brand pemula** | **Funnel B — Owner brand existing** |
|---|---|---|
| Angle | Mulai brand sendiri; edukasi konsep, tahapan, estimasi kebutuhan | Kebutuhan manufaktur, kapasitas, konsistensi, formulasi, repeat order |
| Field form | Jenis produk, kisaran modal, target launch, volume awal | Nama brand, SKU, volume bulanan, spesifikasi, timeline, kendala produksi |
| CTA | Konsultasi memulai brand | Konsultasi kebutuhan produksi / RFQ |
| Kriteria qualified | [TBD oleh Sales] | [TBD oleh Sales] |

**Aturan sistem:**
- Setiap aset, script, LP, campaign, dan lead **wajib** punya `funnel_id` (A, B, atau `both` khusus untuk aset).
- Dashboard dan rekomendasi AI **tidak boleh** mencampur metrik kedua funnel tanpa label yang jelas.

---

## 6. Alur Pengguna Utama

```
1 Upload aset → 2 AI klasifikasi → 3 AI rekomendasi kreatif & script
→ 4 AI generate LP & draft Meta Ads → 5 QA pixel/form/WA → 6 Approval manusia
→ 7 Publish → 8 Tarik metrik + status lead → 9 AI rekomendasi revisi → 10 Review & iterasi
```
[BP]

### 6.1 Cerita pengguna (user stories)
- **US-1** Sebagai Marketing, saya drag-and-drop 1 video + 3 foto dan langsung melihat tag, transkrip, serta skor kualitasnya tanpa mengisi metadata manual (kecuali lisensi).
- **US-2** Sebagai Marketing, saya memilih funnel B lalu mendapat 3–5 aset yang direkomendasikan untuk testing, masing-masing dengan 3 hook dan script 15/30/45 detik.
- **US-3** Sebagai Marketing, saya membuat LP Funnel B dari template, lalu mengetik "ganti hero pakai video pabrik, pindahkan FAQ ke bawah" dan melihat preview versi baru.
- **US-4** Sebagai Admin Ads, saya menjalankan QA otomatis (pixel, form, link WA, mobile) dan baru bisa mengajukan publish kalau QA lolos.
- **US-5** Sebagai Owner, saya menerima satu antrian approval berisi: klaim, publish LP, aktivasi iklan, dan perubahan budget. Masing-masing lengkap dengan snapshot isinya.
- **US-6** Sebagai Sales, saya melihat lead masuk lengkap dengan funnel, campaign, dan LP asalnya, lalu status yang saya isi (qualified/lost + alasan) muncul di dashboard marketing.
- **US-7** Sebagai Marketing, setiap minggu saya menerima rekomendasi AI (aset mana yang dipertahankan, LP mana yang direvisi, brief produksi berikutnya), dengan catatan kecukupan data.

---

## 7. Kebutuhan Fungsional

Prioritas: **P0** = wajib MVP, **P1** = sebaiknya ada di MVP, **P2** = setelah MVP.

### 7.1 Modul A — AI Asset Library [BP]

| ID | Kebutuhan | Prioritas |
|---|---|---|
| A-01 | Upload drag-and-drop: video **MP4/MOV**, foto **JPG/PNG/WebP**; multi-file; upload resumable/multipart langsung ke object storage (presigned URL) | P0 |
| A-02 | Simpan file asli + thumbnail + metadata: durasi, resolusi, ukuran, creator, tanggal ambil, uploader, checksum (cegah duplikat) | P0 |
| A-03 | Field **lisensi/izin wajib**: `internal`, `creator_licensed`, `testimonial_consented`, `unknown`; lampiran bukti izin; tanggal kedaluwarsa izin. Aset `unknown` **tidak bisa** dipakai di LP/iklan publik | P0 |
| A-04 | Versi aset (re-edit footage = versi baru dari aset induk) | P1 |
| A-05 | Setiap aset punya ID unik yang dipakai di seluruh sistem (script, LP, creative, laporan) | P0 |
| A-06 | Galeri dengan filter: funnel, jenis footage, status, lisensi, creator, performa | P0 |
| A-07 | Status aset: `uploaded → processing → analyzed → approved / rejected → archived` | P0 |
| A-08 | Batas ukuran file [TBD, usulan video ≤ 2 GB, foto ≤ 25 MB]; validasi tipe MIME di server | P0 |

### 7.2 Modul A — AI Creative Analyst [BP]

| ID | Kebutuhan | Prioritas |
|---|---|---|
| C-01 | Transkrip video (speech-to-text, Bahasa Indonesia) | P0 |
| C-02 | Analisis: hook 3 detik pertama, pesan utama, jenis footage (pabrik/lab/produk/fasilitas/kreator/testimoni/promo), target audiens (A/B), CTA yang terdeteksi, kualitas dasar (pencahayaan, audio, stabilitas, resolusi) | P0 |
| C-03 | **Deteksi klaim**: menandai kalimat yang berisi klaim (kapasitas, legalitas/izin, sertifikasi, harga/MOQ, efek produk, testimoni) beserta level risikonya. Klaim yang tidak cocok dengan **Claims Library** (§7.8) wajib di-approve | P0 |
| C-04 | Rekomendasi 3–5 aset terbaik untuk testing per funnel, beserta alasannya | P0 |
| C-05 | Per konsep: 3 hook, script 15/30/45 detik, shot list, brief editor, caption, headline, CTA | P0 |
| C-06 | Brief kreator untuk produksi konten baru (apa yang kurang di library) | P1 |
| C-07 | Alur review: approve / minta revisi (dengan komentar) / reject. Revisi membuat versi baru dan menyimpan versi lama | P0 |
| C-08 | Membaca metrik iklan per aset (CTR, CPC, CPL, frekuensi, qualified lead rate) dari integrasi Ads | P1 |
| C-09 | **Aturan kecukupan data**: AI tidak boleh menyebut kreatif "menang" sebelum ambang minimum terpenuhi (usulan: spend ≥ [TBD] **dan** ≥ [TBD] lead per variasi). Di bawah ambang, label yang dipakai adalah "data belum cukup" | P0 |

### 7.3 Modul B — AI Landing Page Builder [BP]

| ID | Kebutuhan | Prioritas |
|---|---|---|
| L-01 | LP dibangun dari **template aman + komponen reusable** (hero, benefit, bukti/portofolio, proses, FAQ, form, CTA WA, footer legal). AI hanya mengisi/menyusun konten, **tidak menulis kode bebas** | P0 |
| L-02 | Input: funnel, tujuan campaign, penawaran yang disetujui (dari Claims Library), aset terpilih, nomor/endpoint WA, konfigurasi tracking | P0 |
| L-03 | Output: headline, hero, benefit, bukti/portofolio **terverifikasi**, FAQ, form sesuai funnel, CTA WhatsApp, layout mobile-first, metadata SEO (title, description, OG image) | P0 |
| L-04 | Editor berbasis prompt: ubah teks, gambar, urutan section, CTA. Setiap perintah menghasilkan **versi baru** | P0 |
| L-05 | Editor manual (edit langsung field teks/gambar) sebagai cadangan kalau prompt gagal | P1 |
| L-06 | Preview desktop & mobile di URL preview (noindex, tidak menembak pixel produksi) | P0 |
| L-07 | Version history + diff + **rollback satu klik** | P0 |
| L-08 | Variasi A/B: dua varian per LP dengan pembagian trafik [TBD: lewat iklan berbeda (usulan MVP) atau split di server] | P1 |
| L-09 | Publish hanya ke **domain/subdomain yang ada di allowlist** | P0 |
| L-10 | **QA gate otomatis sebelum publish**: form submit terkirim, pixel PageView/Lead/Contact menembak, link WA valid & berisi kode ref, skor mobile/LCP, tidak ada klaim yang belum di-approve, semua aset berlisensi | P0 |
| L-11 | **Smoke test setelah publish**: QA yang sama dijalankan ulang di URL produksi; kalau gagal, beri alert dan tawarkan rollback | P0 |
| L-12 | Form menyimpan **consent** (teks consent versi berapa + timestamp) dan UTM | P0 |

### 7.4 Tracking & Atribusi [BP + TAMBAHAN]

| ID | Kebutuhan | Prioritas |
|---|---|---|
| T-01 | Meta Pixel di semua LP produksi; event `PageView`, `Lead` (form submit), `Contact` (klik WA) sesuai definisi di §9 | P0 |
| T-02 | Tangkap & simpan `utm_source/medium/campaign/content/term`, `fbclid`, cookie `_fbp`/`_fbc` | P0 |
| T-03 | **Conversions API (CAPI)** server-side untuk `Lead` dan `Contact`, dengan `event_id` yang sama dengan pixel browser untuk deduplikasi; data pribadi di-hash SHA-256 setelah normalisasi | P1 (P0 bila ad account mewajibkan) |
| T-04 | **[TAMBAHAN] Kode ref WhatsApp.** Klik WA (wa.me) kehilangan UTM, sehingga setiap klik/submit membuat `lead_id` dan kode ref pendek (mis. `HE-B-7K3Q`) yang disisipkan di pesan prefill. Sistem AI WA membaca kode ini untuk mengaitkan percakapan ke lead | P0 |
| T-05 | Event funnel lanjutan dari sistem WA/Sales: `contacted`, `qualified`, `meeting_booked`, `quotation_sent`, `deal_won`, `deal_lost` (+ nilai kontrak, alasan) | P0 |
| T-06 | [P1] Kirim event `qualified`/`deal_won` sebagai custom conversion/offline event ke Meta untuk optimasi kualitas, **hanya status & nilai, tanpa isi chat** | P1 |
| T-07 | Laporan rekonsiliasi: lead di LP vs lead di sistem WA vs lead di Meta; selisih > [TBD]% memicu alert | P0 |

> **Prinsip [BP]:** "Pixel terpasang" belum berarti "tracking benar". Sebelum budget dinaikkan, programmer wajib membuktikan event firing, parameter UTM, deduplikasi, consent, dan kecocokan data CRM.

### 7.5 Integrasi AI Ads (existing) — fase 1 Meta [BP]

| ID | Kebutuhan | Prioritas |
|---|---|---|
| D-01 | **Tarik** dari AI Ads / Meta Marketing API: campaign/adset/ad/creative ID, status, spend, impressions, clicks, CTR, CPC, leads, frequency. Granularitas harian | P0 |
| D-02 | **Kirim** ke AI Ads lewat API internal: `asset_id`, `landing_page_url` + UTM, creative brief, headline/primary text/CTA, draft campaign | P0 |
| D-03 | Semua campaign dibuat dalam status **PAUSED/draft**. Aktivasi dan perubahan budget di atas ambang wajib approval | P0 |
| D-04 | Konvensi penamaan campaign/ad yang memuat `funnel`, `lp_id`, `asset_id` (mis. `HE_B_RFQ_lp12_as88_v2`) supaya atribusi tetap jalan walau UTM hilang | P0 |
| D-05 | Sinkronisasi terjadwal (usulan setiap 1 jam untuk status, harian untuk metrik final) dengan retry + backoff + rate-limit Meta | P0 |
| D-06 | Kalau API AI Ads tidak menyediakan sebuah fungsi, gunakan fallback langsung ke Meta Marketing API dengan izin Admin Ads. Keputusan diambil setelah audit hari 1 | P0 |

### 7.6 Integrasi AI WhatsApp (existing)

#### 7.6.1 Kondisi aktual sistem WA (hasil audit repo `rendydev404/wa-automation-`, commit `338de22`)

**Apa sistem ini:** dashboard multi-nomor + AI auto-reply CS.
- **Stack:** Next.js 16, PostgreSQL 15, Baileys (klien WhatsApp Web **tidak resmi**).
- **AI:** dijalankan oleh Hermes (profil `cs`, lewat 9Router). Knowledge diatur per nomor (PDF/teks).
- **Serah-terima manusia ↔ AI:** AI mundur kalau admin membalas dari HP, dan AI belajar dari balasan admin.
- **Produksi:** VPS `31.97.67.66` (`wa.sukapost.tech`), CI/CD GitHub Actions, sudah ada test suite.
- **Status dipakai:** saat ini melayani Suka Shawarma dan Jasa Video AI. **Belum ada nomor/knowledge Haraka Erfi.**

Blueprint menulis AI WA "sudah punya integrasi lead, status percakapan, qualified lead, opt-out, dan closing". **Kodenya belum sampai sana:**

| Kemampuan yang diasumsikan blueprint | Kondisi di repo | Perlu dibangun di sisi WA |
|---|---|---|
| Entitas lead / `lead_id` | ❌ Tidak ada. Yang ada hanya `percakapan` per lawan bicara (telepon, nama, penghitung pesan) | Tabel link lead ↔ percakapan |
| Atribusi dari iklan/LP | ❌ Tidak ada pembacaan UTM/kode ref | Deteksi `ref_code` di pesan pertama |
| Status `contacted/qualified/meeting/quotation/won/lost` | ❌ Tidak ada | Kolom status + riwayat + UI untuk Sales |
| Kualifikasi lead oleh AI | ❌ AI hanya menjawab dari knowledge, tanpa ekstraksi field terstruktur | Instruksi nomor (pertanyaan per funnel) + ekstraksi status (P1) |
| Opt-out | ❌ Tidak ada | Deteksi kata kunci, AI berhenti, catat event |
| API/webhook untuk sistem lain | ❌ Semua API butuh cookie login dashboard. Satu-satunya endpoint mesin adalah `/api/sinkron` (HMAC), yang bisa dijadikan pola | Endpoint masuk HMAC + outbox webhook keluar |
| Isi chat tidak disimpan | ⚠️ README bilang tidak disimpan, tapi migrasi v2 **menyimpan isi pesan** di `pesan_chat` (maks 2.000 karakter/pesan) | Kebijakan retensi (UU PDP); Factory tetap tidak menyalin isi chat |
| Template resmi WhatsApp | ❌ Tidak mungkin dengan Baileys (bukan WhatsApp Business API) | Lihat W-05 |

**Hal yang sudah ada dan bisa dimanfaatkan:**
- Knowledge per nomor → dipakai untuk mengisi fakta Haraka Erfi dari Claims Library (§7.8).
- Serah-terima manusia ↔ AI → Sales bisa mengambil alih percakapan langsung dari HP.
- Pola HMAC `/api/sinkron` → bisa disalin untuk endpoint integrasi.
- Kebijakan yang sudah ada di kode: hanya membalas chat masuk (tidak pernah memulai), batas 10 balasan/10 menit per chat.

#### 7.6.2 Kebutuhan integrasi

| ID | Kebutuhan | Sisi | Prioritas |
|---|---|---|---|
| W-01 | Factory **mengirim** lead baru ke WA: `POST /api/integrasi/lead` (HMAC + timestamp, idempotent per `lead_id`) berisi `lead_id`, `ref_code`, `funnel`, `campaign_id`/UTM, `landing_page_id`, `lp_version_id`, consent, waktu, data form. Disimpan di tabel baru `lead_link` (status `menunggu_chat`) | WA + Factory | P0 |
| W-02 | **Pencocokan ref code**: pesan masuk pertama dicek dengan regex `HE-[AB]-[A-Z0-9]{4,6}`. Kalau cocok, percakapan dikaitkan ke `lead_id` dan knowledge/instruksi funnel yang sesuai ikut disisipkan ke AI. Kalau tidak ada ref, percakapan tetap dilayani sebagai lead organik | WA | P0 |
| W-03 | **Status lead** di sistem WA: `contacted` dicatat otomatis saat balasan pertama (bot atau manusia) terkirim. `qualified`, `meeting_booked`, `quotation_sent` (+ nilai), `deal_won` (+ nilai), `deal_lost` (+ alasan) diisi Sales lewat tombol di halaman percakapan | WA | P0 |
| W-04 | **Webhook keluar** ke Factory `POST /webhooks/wa/lead-status` dari tabel outbox (retry + backoff, HMAC). Isinya **hanya status dan field terstruktur, tanpa isi chat** | WA | P0 |
| W-05 | **Hanya chat yang dimulai pelanggan.** Karena Baileys tidak resmi dan tidak mendukung template, CTA di LP dan form selalu membuka `wa.me` sehingga **pelanggan yang mengirim pesan pertama**. Sistem tidak pernah mengirim pesan pertama ke nomor dari form | LP + WA | P0 |
| W-06 | **Opt-out**: pesan berisi kata kunci (mis. "stop", "berhenti", "jangan hubungi") membuat AI berhenti di chat itu, lead ditandai `opt_out`, dan event dikirim ke Factory (lead dikeluarkan dari audience retargeting) | WA | P0 |
| W-07 | Nomor + knowledge + instruksi Haraka Erfi: pertanyaan kualifikasi per funnel (§5), fakta hanya dari Claims Library, eskalasi ke Sales untuk harga/MOQ/kontrak | WA (konfigurasi) | P0 |
| W-08 | **[P1] Saran kualifikasi oleh AI**: setelah N pesan, AI mengekstrak field funnel (jenis produk, modal, volume, dll.) ke JSON dan mengusulkan `qualified`. Sales mengonfirmasi dengan satu klik | WA | P1 |
| W-09 | Kebijakan retensi `pesan_chat` untuk nomor Haraka Erfi [TBD, usulan 180 hari] dan akses hanya untuk Sales/Owner | WA | P1 |
| W-10 | Factory **tidak pernah** menarik isi percakapan; dashboard Factory hanya menampilkan status dan field terstruktur | Factory | P0 |

**Estimasi perubahan di repo WA:** sekitar 1–2 hari kerja dengan Claude. Rinciannya: migrasi v7 (`lead_link`, `lead_status_log`, `outbox`), 1 endpoint HMAC masuk, worker outbox, deteksi ref code + opt-out di `src/lib/bridge.ts`, dan tombol status di halaman nomor. Perubahan wajib lolos `npm run uji` + uji baru sebelum auto-deploy berjalan.

### 7.7 Orchestrator, Approval & Guardrails [BP]

| ID | Kebutuhan | Prioritas |
|---|---|---|
| O-01 | Orchestrator menjalankan pipeline §6 sebagai job asinkron (Celery), dengan status per langkah yang terlihat di UI | P0 |
| O-02 | Setiap pemanggilan AI dicatat di `agent_runs`: agen, input ref, versi prompt, model, token, biaya, output, error, durasi | P0 |
| O-03 | **Antrian approval** terpusat (lihat matriks §10); approval menyimpan snapshot isi yang disetujui. Kalau isi berubah setelah disetujui, approval otomatis batal | P0 |
| O-04 | **Kill switch global** untuk semua otomasi keluar (publish, push ke Ads, notifikasi WA), plus kill switch per modul | P0 |
| O-05 | Batas keras: budget harian maksimum, allowlist domain, **stop-loss campaign** (pause otomatis bila CPL/cost per qualified lead > [TBD] setelah spend ≥ [TBD]), batas biaya AI per hari | P0 |
| O-06 | Audit log untuk setiap perubahan entitas (siapa/agen apa, sebelum/sesudah, kapan) | P0 |
| O-07 | Notifikasi (email/WA internal/Slack [TBD]) untuk: approval menunggu, QA gagal, stop-loss terpicu, sinkronisasi gagal | P1 |
| O-08 | **Optimizer agent** (mingguan): membaca metrik + status lead lalu menghasilkan rekomendasi revisi aset/LP/brief, dengan label kecukupan data. Hanya **mengusulkan**, tidak mengeksekusi | P1 |

### 7.8 [TAMBAHAN] Claims & Offers Library

Blueprint mensyaratkan bahwa produk, kapasitas, legalitas, portofolio, MOQ, harga, dan klaim **harus diverifikasi** sebelum dipakai. Supaya aturan ini bisa ditegakkan oleh sistem, perlu satu sumber kebenaran:

| ID | Kebutuhan | Prioritas |
|---|---|---|
| K-01 | Daftar klaim/penawaran yang disetujui: teks, kategori (kapasitas, legalitas, sertifikasi, MOQ, harga, promo, portofolio, testimoni), bukti, approver, berlaku sampai | P0 |
| K-02 | Generator LP & copy iklan **hanya boleh** memakai klaim dari library. Teks klaim baru yang dihasilkan AI ditandai dan masuk antrian approval | P0 |
| K-03 | Klaim yang kedaluwarsa (mis. promo berakhir) otomatis memberi peringatan pada LP/iklan yang memakainya | P1 |

### 7.9 Dashboard Ringan [BP]

| ID | Kebutuhan | Prioritas |
|---|---|---|
| H-01 | Ringkasan per funnel: spend, lead, CPL, qualified lead, cost per qualified lead, meeting rate, quote rate, closing rate | P0 |
| H-02 | Breakdown per campaign → ad → aset → LP/versi | P0 |
| H-03 | Status pipeline konten (aset di proses, script menunggu review, LP draft/live, approval tertunda) | P0 |
| H-04 | Panel kesehatan tracking: event firing 24 jam terakhir, rasio dedup, selisih rekonsiliasi | P0 |
| H-05 | Tab rekomendasi AI (dari O-08) beserta status tindak lanjutnya | P1 |
| H-06 | CAC & gross profit bila data biaya/margin tersedia | P2 |

---

## 8. Kebutuhan Non-Fungsional

| Area | Kebutuhan |
|---|---|
| **Keamanan** | Credential (Meta token, OpenAI key, API WA/Ads) hanya di server, disimpan di secret manager/env terenkripsi, tidak pernah dikirim ke browser. RBAC per peran. Webhook masuk diverifikasi HMAC. Rate limit di endpoint publik (form LP). Proteksi bot/spam pada form [TBD: honeypot + rate limit di MVP] |
| **Privasi** | Patuh **UU No. 27/2022 tentang Pelindungan Data Pribadi**: consent tercatat, tujuan pemrosesan jelas, data minimum, hak hapus/opt-out. PII (nama, no. HP, email) dienkripsi saat disimpan atau dibatasi aksesnya. Hash SHA-256 sebelum dikirim ke Meta. Retensi data [TBD] |
| **Keandalan** | Retry + exponential backoff untuk semua integrasi; job idempotent; dead-letter queue untuk job gagal; webhook idempotent berdasarkan `event_id` |
| **Performa LP** | Mobile-first; LCP < 2,5 detik di 4G; gambar dioptimasi (WebP/AVIF, ukuran responsif); video hero lazy/poster |
| **Performa sistem** | Analisis 1 video berdurasi ≤ 1 menit selesai < 5 menit; dashboard memuat < 3 detik untuk data 90 hari |
| **Ketersediaan** | LP produksi ≥ 99,5% uptime; dashboard internal boleh lebih rendah |
| **Biaya AI** | Batas biaya harian/bulanan AI [TBD]; biaya per `agent_run` tercatat; cache hasil analisis per checksum aset |
| **Observability** | Log terstruktur, error tracking (mis. Sentry), metrik job queue, alert integrasi gagal |
| **Lingkungan** | **Staging** terpisah (pixel test/Meta test events, sandbox WA) dan production. Backup database harian + uji restore |
| **Auditability** | Setiap langkah dapat diaudit dan dibatalkan (definisi selesai [BP]) |

---

## 9. Definisi Event Tracking

| Tahap | Event | Pemicu | Dikirim ke |
|---|---|---|---|
| LP | `page_view` | Halaman dimuat (setelah consent bila diperlukan) | Pixel `PageView`, DB internal |
| LP | `whatsapp_click` | Klik tombol WA; membuat `lead_id` + `ref_code` | Pixel+CAPI `Contact`, DB, webhook WA |
| LP | `form_submit` / `lead` | Form valid terkirim | Pixel+CAPI `Lead`, DB, webhook WA |
| WhatsApp | `contacted` | AI WA/agen membalas pertama kali | DB (dari webhook WA) |
| WhatsApp | `qualified` | Memenuhi definisi qualified (§5) | DB; [P1] offline event ke Meta |
| WhatsApp | `meeting_booked` | Jadwal konsultasi dibuat | DB |
| Sales | `quotation_sent` | Penawaran dikirim (+ nilai) | DB |
| Sales | `deal_won` / `deal_lost` | Keputusan akhir (+ nilai / alasan) | DB; [P1] offline event ke Meta |
| Semua | `opt_out` | Lead minta berhenti | DB; blok kontak & audience |

**Parameter wajib setiap event:** `event_id`, `lead_id` (bila ada), `funnel_id`, `landing_page_id`, `lp_version_id`, `utm_*`, `campaign_id`/`ad_id` (bila diketahui), `occurred_at`, `source_system`.

**KPI turunan [BP]:** CPL, cost per qualified lead, meeting rate, quote rate, closing rate, CAC, dan gross profit (bila data tersedia).

---

## 10. Matriks Approval & Guardrails

| Tindakan | Otomatis | Butuh approval | Approver default |
|---|---|---|---|
| Tagging & analisis aset | ✅ | — | — |
| Draft script, brief, caption | ✅ | Review sebelum dipakai | Marketing |
| Draft LP & draft iklan (PAUSED) | ✅ | — | — |
| Klaim pabrik, kapasitas, legalitas, sertifikasi | — | ✅ | Owner |
| Testimoni (butuh bukti izin) | — | ✅ | Owner / Marketing lead |
| Promo / diskon / harga / MOQ | — | ✅ | Owner |
| Publish / ganti versi LP live | — | ✅ (setelah QA lolos) | Marketing lead |
| Aktivasi iklan | — | ✅ | Admin Ads |
| Perubahan budget > [TBD]% atau > Rp [TBD]/hari | — | ✅ | Owner |
| Pause campaign karena stop-loss | ✅ (lalu notifikasi) | — | — |
| Rollback LP saat smoke test gagal | Usulan: ✅ otomatis + notifikasi [TBD] | — | — |

**Batas keras (tidak bisa dilewati oleh approval biasa):** total budget harian maks Rp [TBD], allowlist domain publish, kill switch, aset tanpa lisensi tidak bisa dipublikasikan.

---

## 11. Arsitektur Teknis [BP + TAMBAHAN]

```
            ┌───────────────────────────── Next.js ─────────────────────────────┐
 Pengguna → │ Dashboard internal (auth, RBAC)     │  LP Renderer (publik, SSR/ISR)│ ← Pengunjung iklan
            └───────────────┬─────────────────────┴──────────────┬───────────────┘
                            │ REST/JSON                          │ form, events
                    ┌───────▼────────────────────────────────────▼───────┐
                    │              FastAPI (Python) — API utama          │
                    │  assets · analysis · scripts · LP · tracking ·     │
                    │  campaigns · leads · approvals · webhooks · admin  │
                    └───┬──────────────┬──────────────┬──────────────┬───┘
                        │              │              │              │
                 PostgreSQL     Redis + Celery   Object storage   Secret store
                 (data inti)    (jobs, jadwal)   S3-compatible
                                       │
              ┌────────────────────────┼─────────────────────────────┐
              ▼                        ▼                             ▼
        OpenAI API              AI Ads (existing) /            AI WhatsApp (existing)
   (klasifikasi, analisis,      Meta Marketing API,            webhook in/out
   penulisan, tool calling,     Pixel + CAPI
   transkripsi)
```

**Keputusan teknis:**
- **Frontend:** Next.js (App Router) untuk dashboard dan renderer LP. [BP]
- **[TAMBAHAN] Publish LP:** konten LP disimpan sebagai JSON terstruktur (`landing_page_versions.content`) dan dirender oleh template Next.js di subdomain (mis. `lp.harakaerfi.com`, [TBD]). *Publish* = mengarahkan `published_version_id` + revalidate cache. *Rollback* = mengarahkan kembali ke versi sebelumnya (hitungan detik, tanpa deploy ulang). Pilihan ini memenuhi syarat "CMS/deploy API berizin" tanpa mengubah situs utama. Alternatifnya bisa dipertimbangkan kalau harakaerfi.com memakai CMS yang wajib dipakai.
- **Backend:** Python FastAPI, Pydantic untuk skema, SQLAlchemy + Alembic untuk migrasi. [BP]
- **Jobs:** Redis + Celery (+ Celery Beat untuk sinkronisasi terjadwal). [BP]
- **Storage:** object storage kompatibel S3, upload memakai presigned URL; ffmpeg di worker untuk thumbnail, metadata, potongan frame, dan audio. [BP + TAMBAHAN]
- **AI:** OpenAI API untuk transkripsi, analisis visual (sampling frame per beberapa detik + 3 detik pertama), penulisan, dan tool calling. Output dibatasi **structured output / JSON schema**. Prompt diberi versi dan disimpan di repo. [BP + TAMBAHAN]
- **[TAMBAHAN] Lapisan adapter** untuk LLM, Ads, dan WA (interface + implementasi), supaya penambahan TikTok/Google Ads nanti dan penggantian model tidak mengubah logika inti.

---

## 12. Model Data

Entitas inti dari blueprint, plus beberapa tambahan yang ditandai.

| Entitas | Field utama |
|---|---|
| `users` | id, nama, email, role, aktif |
| `assets` | id, type (video/photo), storage_key, thumbnail_key, mime, size, checksum, duration_s, width, height, creator, captured_at, uploaded_by, license_status, license_doc_key, license_expires_at, parent_asset_id, version, funnel (A/B/both), status |
| `asset_analysis` | id, asset_id, agent_run_id, transcript, hook_3s, key_message, footage_type, audience, cta_detected, claims_detected (jsonb: teks, kategori, risiko, claim_id cocok), quality (jsonb: skor + isu), tags[] |
| `scripts` | id, funnel, duration (15/30/45), hooks[3], body, shot_list (jsonb), caption, headline, cta, source_asset_ids[], version, status, reviewed_by |
| `content_briefs` | id, type (editor/creator), funnel, script_id, asset_ids[], instructions, assignee, due_date, status |
| `landing_pages` | id, slug, funnel, campaign_goal, template_id, domain, current_version_id, published_version_id, status |
| `landing_page_versions` | id, landing_page_id, version_no, variant_key (A/B), content (jsonb sections), asset_ids[], claim_ids[], change_prompt, created_by (user/agent_run), qa_result (jsonb), published_at |
| `tracking_configs` | id, landing_page_id, pixel_id, capi_enabled, event_mapping (jsonb), wa_number, wa_prefill_template, utm_defaults, consent_text_version |
| `campaigns` | id, external_id, platform (meta), funnel, objective, name, status, daily_budget, landing_page_id, ads_system_ref |
| `ad_creatives` | id, campaign_id, adset_external_id, ad_external_id, creative_external_id, asset_id, script_id, headline, primary_text, cta, utm, status |
| `ad_metrics_daily` **[TAMBAHAN]** | date, ad_creative_id, spend, impressions, clicks, ctr, cpc, leads, frequency (unik per date+ad) |
| `leads` | id, ref_code, source (form/wa_click), funnel, landing_page_id, lp_version_id, campaign_id, ad_creative_id, utm_*, fbclid, fbp, fbc, form_payload (jsonb, terenkripsi), phone (terenkripsi) + phone_hash, consent_at, consent_text_version, current_status, created_at |
| `lead_events` | id, lead_id, event, reason, value_idr, occurred_at, source_system, external_event_id (unik → idempotent) |
| `approvals` | id, subject_type, subject_id, action, payload_snapshot (jsonb), snapshot_hash, requested_by (user/agent_run), status (pending/approved/rejected/expired/invalidated), decided_by, decided_at, note |
| `claims` **[TAMBAHAN]** | id, category, text, evidence_key, approved_by, valid_from, valid_until, status |
| `guardrail_settings` **[TAMBAHAN]** | kill switch (global & per modul), max daily budget, budget change threshold, stop-loss rules, allowed_domains, AI cost cap, approver per action |
| `agent_runs` | id, agent, input_refs (jsonb), prompt_version, model, tokens_in, tokens_out, cost_usd, status, output (jsonb), error, duration_ms, created_at |
| `audit_logs` | id, actor_type (user/agent/system), actor_id, action, entity, entity_id, before (jsonb), after (jsonb), ip, at |

---

## 13. Kontrak API (draft)

> Kontrak final ditetapkan setelah audit API AI Ads di hari 1 (WA sudah diaudit, lihat §7.6.1). Semua endpoint internal memakai auth + RBAC.

**Aset & analisis**
- `POST /assets/upload-url` → presigned URL multipart
- `POST /assets` → daftarkan aset setelah upload (metadata + lisensi), memicu job analisis
- `GET /assets?funnel=&status=&type=&license=` · `GET /assets/{id}` (+ analisis + performa)
- `POST /assets/{id}/reanalyze`

**Kreatif**
- `POST /creative/recommendations` {funnel, goal} → 3–5 aset + alasan
- `POST /scripts/generate` {funnel, asset_ids, durations} · `POST /scripts/{id}/review` {action: approve|revise|reject, comment}
- `POST /briefs/generate` {script_id | gap_analysis}

**Landing page**
- `POST /landing-pages` {funnel, goal, template_id, asset_ids, claim_ids, tracking_config}
- `POST /landing-pages/{id}/edit` {prompt} → versi baru · `PATCH /landing-pages/{id}/versions/{v}` (edit manual)
- `GET /landing-pages/{id}/versions` · `POST /landing-pages/{id}/qa` · `POST /landing-pages/{id}/publish` (butuh approval) · `POST /landing-pages/{id}/rollback` {version_id}

**Publik (dari LP)**
- `POST /public/events` {event_id, type, lp_version_id, utm, fbp, fbc} (rate-limited)
- `POST /public/leads` {lp_version_id, form, consent} → {lead_id, ref_code, wa_url}
- `POST /public/wa-click` {lp_version_id, utm…} → {lead_id, ref_code, wa_url}

**Ads**
- `POST /campaigns/draft` {funnel, lp_id, creatives[]} → diteruskan ke AI Ads, status PAUSED
- `POST /campaigns/{id}/activate` (butuh approval) · `POST /campaigns/{id}/budget` (approval bila di atas ambang)
- Job: `sync_ads_metrics` (per jam / harian)

**WhatsApp** (detail di §7.6.2)
- Factory → WA: `POST https://wa.sukapost.tech/api/integrasi/lead`
  - Header: `x-he-waktu` (epoch detik, toleransi ≤ 5 menit), `x-he-tanda` = HMAC-SHA256(`waktu + "." + body`)
  - Body: `{lead_id, ref_code, funnel, utm, campaign_id, landing_page_id, lp_version_id, consent_at, form}`
  - Respons: `202`; idempotent per `lead_id`
- WA → Factory: `POST /webhooks/wa/lead-status`
  - Body: `{external_event_id, lead_id|null, ref_code|null, wa_number_id, status, reason, value_idr, occurred_at}`
  - Diverifikasi HMAC dan idempotent per `external_event_id`
  - Lead organik (tanpa ref) dikirim dengan `lead_id = null`; Factory membuat lead `source=wa_organic`
- Rahasia HMAC terpisah untuk tiap arah dan disimpan di `.env` masing-masing server

**Orkestrasi & admin**
- `GET /approvals?status=pending` · `POST /approvals/{id}/decide`
- `GET /agent-runs` · `GET /audit-logs`
- `GET/PUT /settings/guardrails` (hanya Owner) · `POST /settings/kill-switch`
- `GET /dashboard/summary?funnel=&from=&to=` · `GET /dashboard/tracking-health`

---

## 14. Rencana MVP 10 Hari Kerja

Blueprint memperkirakan 21 hari. Dengan pengerjaan dibantu Claude, coding tidak lagi menjadi bagian terlama, sehingga jadwal dipadatkan menjadi **10 hari kerja**: sekitar 7 hari build dan 3 hari validasi dengan trafik nyata.

Acceptance criteria dari blueprint [BP] tetap dipakai, hanya dipindah ke hari yang baru. Ada dua jalur kerja yang berjalan paralel:
- **Factory** = repo baru (sistem AI Marketing Factory)
- **WA** = repo `wa-automation-` (sistem WhatsApp yang sudah ada)

### Prasyarat hari 0 (harus siap sebelum hari 1, kalau belum maka jadwal mundur)
- [ ] Owner mengisi angka [TBD] prioritas: definisi qualified lead per funnel, budget harian maksimum, ambang stop-loss → Verifikasi: tercatat di §5 dan §10
- [ ] Akses: repo AI Ads (atau dokumentasinya), push ke repo WA, Meta ad account + Pixel ID + Business Manager, domain/subdomain LP, server Factory → Verifikasi: tiap akses sudah dites login/push
- [ ] Ajukan akses Meta Marketing API bila AI Ads belum punya, karena app review Meta bisa makan beberapa hari → Verifikasi: status pengajuan tercatat
- [ ] Bahan: 1 video + 3 foto berizin, daftar klaim/MOQ/promo yang disetujui, nomor WA Haraka Erfi → Verifikasi: file ada di folder bersama, klaim siap dimasukkan ke `claims`
- [ ] Keputusan stack (§19 no. 3b) dan Baileys vs Cloud API (§19 no. 3) → Verifikasi: tercatat di §19

### Hari 1 — Audit & fondasi
- [ ] Audit repo AI Ads, lalu kunci kontrak §13 (Ads & WA) → Verifikasi: contoh request/response nyata tersimpan di `docs/contracts/`
- [ ] Scaffold Factory (Next.js + FastAPI + Postgres + Redis/Celery + S3) + staging → Verifikasi: `docker compose up` jalan dan healthcheck semua service hijau
- [ ] Skema DB §12 + migrasi + auth/RBAC → Verifikasi: migrasi naik/turun bersih; peran Viewer ditolak (403) di endpoint tulis

### Hari 2 — Asset Library · *Acceptance [BP]: video/foto bisa diunggah, disimpan, diberi ID dan tag*
- [ ] Upload presigned multipart + job ffmpeg (metadata, thumbnail, frame, audio) + field lisensi → Verifikasi: 1 MP4 + 3 JPG muncul di galeri lengkap dengan ID, thumbnail, durasi; aset `unknown` diberi tanda terblokir
- [ ] **WA:** migrasi v7 (`lead_link`, `lead_status_log`, `outbox`) + endpoint HMAC `/api/integrasi/lead` → Verifikasi: uji baru lolos (tanda tangan salah → 401, kirim ulang `lead_id` yang sama → tidak dobel); `npm run uji` hijau

### Hari 3 — Creative Analyst · *Acceptance [BP]: AI menghasilkan brief per funnel; user bisa approve/revisi*
- [ ] Transkripsi + analisis frame + deteksi klaim vs `claims` + `agent_runs` → Verifikasi: video uji menghasilkan transkrip, hook 3 detik, footage_type, dan klaim yang tidak ada di library ditandai
- [ ] Rekomendasi aset + script 15/30/45 + hook + brief + caption, lalu UI review approve/revisi/reject → Verifikasi: funnel A & B masing-masing keluar 3 hook + 3 script yang valid JSON schema; revisi membuat versi baru
- [ ] **WA:** deteksi `ref_code` + status `contacted` otomatis + opt-out di `bridge.ts` → Verifikasi: uji alur: pesan "Halo HE-B-7K3Q" mengaitkan percakapan ke lead; "stop" membuat AI diam dan status `opt_out` tercatat

### Hari 4 — Landing Page Builder · *Acceptance [BP]: dua LP bisa di-preview*
- [ ] 2 template (A & B) dari komponen reusable + renderer + preview noindex → Verifikasi: LP A & B tampil benar di 375 px dan 1440 px
- [ ] Generator dari aset + klaim, editor prompt, version history, rollback → Verifikasi: prompt "pindahkan FAQ ke atas" membuat versi baru; rollback < 10 detik
- [ ] **WA:** tombol status untuk Sales + worker outbox webhook keluar → Verifikasi: klik `qualified` membuat baris outbox yang terkirim ke endpoint uji dengan HMAC valid; endpoint mati → dicoba ulang

### Hari 5 — Tracking & QA gate · *Acceptance [BP]: event dan form lolos tes*
- [ ] Pixel + CAPI dengan `event_id` dedup, UTM/fbp/fbc, consent, `/public/leads` & `/public/wa-click` (ref code) → Verifikasi: Meta Test Events menampilkan PageView/Lead/Contact ter-dedup; link `wa.me` berisi ref code
- [ ] QA gate sebelum publish + smoke test setelah publish → Verifikasi: LP dengan aset tanpa lisensi atau klaim belum di-approve gagal QA dan tombol publish terkunci
- [ ] **WA:** deploy perubahan + nomor & knowledge & instruksi Haraka Erfi (W-07) → Verifikasi: CI hijau dan auto-deploy sukses; chat uji ke nomor Haraka dijawab sesuai funnel tanpa menyebut fakta di luar knowledge

### Hari 6 — Integrasi Ads & approval
- [ ] Push draft campaign PAUSED ke AI Ads (fallback: Meta API langsung) + sinkronisasi metrik → Verifikasi: draft muncul di Ads Manager dengan penamaan D-04; metrik kemarin masuk `ad_metrics_daily`
- [ ] Antrian approval (snapshot + invalidasi) + guardrails + kill switch → Verifikasi: mengubah LP setelah di-approve membatalkan approval; kill switch memblokir publish dan push Ads

### Hari 7 — Dashboard & uji end-to-end di staging
- [ ] Dashboard per funnel + kesehatan tracking + laporan rekonsiliasi (T-07) → Verifikasi: angka lead di dashboard = lead di DB = lead di sistem WA untuk data uji
- [ ] Uji end-to-end staging: upload → script → LP → QA → approval → publish → klik WA dengan ref → status `qualified` kembali → tampil di dashboard → Verifikasi: semua langkah tercatat di `audit_logs`; rollback & pause berhasil

### Hari 8–10 — Pilot production · *Acceptance [BP]: draft campaign dari aset, lead teratribusi, laporan metrik*
- [ ] Publish 2 LP + aktivasi campaign dengan budget pilot kecil [TBD] (lewat approval) → Verifikasi: smoke test production hijau; event muncul di Events Manager
- [ ] Pantau harian: rekonsiliasi lead, memori VPS WA, error integrasi; Sales mengisi status → Verifikasi: selisih rekonsiliasi ≤ [TBD]%; tidak ada lead tanpa atribusi yang bukan organik
- [ ] Tutup pilot: jalankan skenario Definition of Done (§17) + daftar perbaikan → Verifikasi: DoD lulus; daftar perbaikan masuk backlog

### Jalur kritis & asumsi
- **Jalur kritis:** akses Meta API (hari 6) dan kontrak AI Ads (hari 1). Kalau AI Ads ternyata hanya bisa membaca metrik dan akses Meta API belum keluar, hari 6 diganti dengan **ekspor draft campaign untuk dibuat manual oleh Admin Ads**, dan pilot tetap berjalan.
- **Hari 8–10 bukan waktu coding.** Lead B2B butuh waktu untuk masuk dan diproses Sales. Kalau lead `qualified` pertama belum muncul di hari 10, pilot diperpanjang tanpa menahan rilis fitur.
- **Review manusia:** semua perubahan yang menyentuh PII, credential, budget, dan repo WA (yang dipakai bersama usaha lain) di-review sebelum merge.
- **Asumsi:** prasyarat hari 0 sudah lengkap. Setiap prasyarat yang terlambat menggeser jadwal sebesar keterlambatannya.

---

## 15. Tanggung Jawab [BP]

| Peran | Deliverable |
|---|---|
| Programmer backend/AI | Asset ingestion, AI tools, orchestration, API adapters, database, job queue |
| Programmer frontend | Dashboard upload, review script, editor LP, preview, publish, history |
| Tim marketing/kreator | Upload footage, validasi script, brief shooting baru, persetujuan klaim |
| Admin Ads | Akses akun, QA pixel/event, review campaign & budget |
| Sales | Definisi qualified lead, feedback alasan loss, nilai quotation & closing |
| Owner/project leader | Approval target, batas biaya, penawaran, keputusan scale |

---

## 16. Dependensi (Checklist Sebelum Coding) [BP]

- [ ] Dokumentasi endpoint AI Ads yang berjalan, jenis akses Meta, contoh data metrik
- [x] ~~Dokumentasi webhook/API AI WhatsApp~~ → sudah diaudit dari repo (§7.6.1). Hasilnya: API lead/status **belum ada** dan harus dibangun (§7.6.2)
- [ ] Akses push ke repo `wa-automation-` + persetujuan pemilik repo untuk perubahan W-01..W-07
- [ ] Nomor WhatsApp Haraka Erfi yang akan dipakai (sebaiknya nomor yang sudah lama aktif, bukan nomor baru)
- [ ] Akses domain/subdomain, repo/CMS, hosting, proses deploy Haraka Erfi
- [ ] Meta Pixel ID, ad account, business permissions, aturan conversion event
- [ ] Kumpulan video/foto beserta izin pakai; daftar produk, klaim, MOQ, promo yang disetujui (→ isi awal Claims Library)
- [ ] Definisi qualified lead per funnel dan PIC approval iklan/LP
- [ ] **[TAMBAHAN]** OpenAI API key organisasi + batas biaya bulanan
- [ ] **[TAMBAHAN]** Angka guardrail: budget harian maks, ambang perubahan budget, ambang stop-loss, ambang kecukupan data
- [ ] **[TAMBAHAN]** Teks consent & kebijakan privasi untuk form LP (direview pihak legal/Owner)

---

## 17. Definition of Done (MVP) [BP]

Tim mengunggah **1 video + 3 foto** → AI menghasilkan **brief/script** dan **dua variasi landing page** → **pixel, form, dan WA lolos uji** → **draft Meta Ads** terbentuk dari aset tersebut → **lead berkualitas terlihat di dashboard**.

Semua langkah tercatat di audit log dan dapat dibatalkan (rollback LP, pause campaign, kill switch).

---

## 18. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| API AI Ads existing tidak terdokumentasi atau tidak lengkap (WA sudah dipastikan perlu dibangun, §7.6) | Integrasi Ads di hari 6 mundur | Audit di hari 1; adapter dengan fallback ke Meta API langsung; mock server untuk pengembangan |
| Akses Meta Marketing API terbatas (app review, permission) | Draft campaign tidak bisa dibuat otomatis | Ajukan akses di minggu pertama; fallback: ekspor draft untuk dibuat manual oleh Admin Ads |
| AI membuat klaim yang tidak benar (halusinasi) di LP/iklan | Risiko reputasi & regulasi | Claims Library + deteksi klaim + approval wajib; template tidak menerima teks klaim bebas |
| Atribusi WA putus (UTM hilang di wa.me) | Kualitas lead tidak bisa dikaitkan ke iklan | Ref code di pesan prefill (T-04) + laporan rekonsiliasi (T-07) |
| Volume lead B2B rendah, sehingga keputusan diambil dari data yang belum signifikan | Salah memilih kreatif | Aturan kecukupan data (C-09); rekomendasi diberi label tingkat kepercayaan |
| **Nomor WA dibatasi/diblokir** karena Baileys adalah klien tidak resmi, ditambah lonjakan chat dari iklan | Kanal utama penjualan hilang | Hanya chat yang dimulai pelanggan (W-05); batas laju yang sudah ada; nomor lama yang sudah "hangat"; naikkan budget bertahap; siapkan nomor cadangan. **Jangka menengah:** evaluasi migrasi ke WhatsApp Business Cloud API resmi bila volume lead naik [TBD] |
| Isi chat tersimpan di sistem WA (`pesan_chat`) | Risiko UU PDP | Retensi + pembatasan akses (W-09); Factory tidak menarik isi chat (W-10) |
| Sistem WA dipakai bersama usaha lain (Suka Shawarma, Jasa Video AI) di VPS kecil (app 512 MB, DB 256 MB) | Lonjakan Haraka mengganggu usaha lain, atau sebaliknya | Fitur lead diaktifkan per nomor (flag); Factory memakai database & server sendiri, tidak menumpang di Postgres WA; pantau memori setelah pilot |
| Opt-out tidak terdeteksi | Pelanggaran izin, reputasi | Daftar kata kunci + tombol opt-out manual untuk Sales (W-06) |
| Biaya AI (video) membengkak | Melebihi anggaran | Sampling frame, cache per checksum, batas biaya harian, biaya per run tercatat |
| Aset tanpa izin terpakai di iklan | Sengketa hak cipta/testimoni | `license_status` wajib; aset `unknown` diblokir di QA gate |
| Data pribadi bocor | Pelanggaran UU PDP | Enkripsi PII, RBAC, hashing, tidak menyimpan isi chat, audit log |

---

## 19. Pertanyaan Terbuka

1. Apakah harakaerfi.com memakai CMS tertentu (WordPress, dll.)? Apakah LP boleh di subdomain terpisah seperti `lp.harakaerfi.com`?
2. Seperti apa bentuk API AI Ads sekarang: bisa membuat campaign/adset/ad, atau hanya membaca metrik?
3. ~~Apakah sistem AI WA bisa membaca ref code?~~ **Terjawab: belum bisa**, perlu dibangun (§7.6.2). Pertanyaan yang tersisa: siapa yang mengerjakan dan me-review perubahan di repo `wa-automation-`, dan apakah Haraka Erfi tetap memakai Baileys atau langsung pindah ke WhatsApp Business Cloud API resmi?
3b. **Stack Factory:** blueprint menetapkan FastAPI (Python), sementara sistem WA memakai Next.js/TypeScript + PostgreSQL. Tetap FastAPI (sesuai blueprint, cocok untuk pipeline AI/video), atau seragamkan ke TypeScript supaya satu tim memegang satu stack?
4. Apa definisi **qualified lead** untuk Funnel A dan B?
5. Berapa angka guardrail: budget harian maksimum, ambang perubahan budget, stop-loss, ambang data "menang"?
6. A/B test LP: lewat dua iklan berbeda (lebih sederhana, usulan MVP) atau split trafik di server?
7. Channel notifikasi internal yang dipakai tim: email, WhatsApp internal, atau Slack?
8. Retensi data lead dan aset: berapa lama data disimpan?
9. Hosting: cloud apa yang dipakai/diizinkan (mempengaruhi pilihan object storage & secret manager)?
10. Apakah CAPI wajib di MVP atau cukup pixel browser lebih dulu?

---

## 20. Rencana Setelah MVP (P2)

- Konektor TikTok Ads & Google Ads lewat lapisan adapter yang sama
- Kirim offline conversion (qualified/deal) ke Meta untuk optimasi value-based
- Split-test LP di server dengan alokasi trafik otomatis (dibatasi guardrail)
- Analisis gap konten otomatis → kalender produksi kreator
- CAC & gross profit per campaign (integrasi data biaya/margin)
