# Tanya Rara — AI Avatar Haraka Erfi

Satu halaman website berisi avatar AI "Rara" yang menjawab pertanyaan calon klien maklon kosmetik PT Haraka Erfi, lewat suara maupun ketikan, lalu mengumpulkan lead. Versi ini adalah **demo internal**.

- Desain: `docs/superpowers/specs/2026-10-30-ai-avatar-haraka-design.md`
- Rencana kerja: `docs/superpowers/plans/2026-10-30-ai-avatar-haraka.md`
- Spesifikasi klip video avatar: `docs/avatar-clip-spec.md`

## Cara kerja singkat

```
Browser                                   Server (Vercel)
───────                                   ───────────────
mic → Web Speech API (id-ID) ─┐
ketik / chip ─────────────────┼─▶ /api/chat ──▶ model AI (OpenAI-compatible, streaming)
                              │                  └─ log anonim → Supabase chat_logs
jawaban teks ◀────────────────┘
jawaban → /api/tts ──▶ ElevenLabs ──▶ audio → avatar "berbicara"
form lead → /api/lead ──▶ ringkasan AI → Supabase leads → email (Resend)
```

Avatar punya 4 keadaan: `idle`, `listening`, `thinking`, `speaking`. Komponennya (`components/avatar/`) bisa ditukar: saat ini placeholder (gambar diam + animasi), nanti klip video, dan di masa depan avatar real-time.

## Menjalankan di komputer

1. Pasang Node.js 20 atau lebih baru.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env.local` dan isi kunci-kuncinya (lihat bagian berikut). **Jangan commit `.env.local`.**
4. Jalankan `npm run dev`, lalu buka http://localhost:3000 di **Chrome atau Edge** (mic hanya jalan di dua browser ini; di browser lain pengunjung cukup mengetik).
5. Untuk tes, jalankan `npm test`.

Untuk melihat keempat keadaan avatar bergantian: http://localhost:3000/?debugAvatar=1

## Akun dan kunci yang dibutuhkan (semua paket gratis)

| Variabel | Dari mana |
|---|---|
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | Google AI Studio → buat API key. Base URL sudah terisi untuk endpoint OpenAI-compatible Gemini. Isi `LLM_MODEL` dengan model Flash terbaru yang ada paket gratisnya (lihat daftar model di AI Studio). Penyedia lain yang OpenAI-compatible juga bisa: cukup ganti tiga variabel ini. |
| `ELEVENLABS_API_KEY` | elevenlabs.io → Profile → API Keys |
| `ELEVENLABS_VOICE_ID` | Voice Library ElevenLabs → pilih suara perempuan yang bagus berbahasa Indonesia → salin Voice ID |
| `ELEVENLABS_MODEL` | Biarkan `eleven_multilingual_v2` (mendukung bahasa Indonesia) kecuali ada model yang lebih baru |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | supabase.com → project baru → Settings → API. Kunci service role hanya untuk server. |
| `RESEND_API_KEY`, `LEAD_EMAIL_FROM`, `LEAD_EMAIL_TO` | resend.com → API Keys. Tanpa domain terverifikasi, gunakan `onboarding@resend.dev` sebagai pengirim; penerimanya harus email akun Resend itu sendiri. `LEAD_EMAIL_TO` bisa beberapa alamat, dipisah koma. |

Catatan paket gratis ElevenLabs: sekitar 10 menit suara per bulan dan **tidak untuk komersial**. Cukup untuk demo. Sebelum dibuka ke publik, naikkan ke paket berbayar dan hapus tulisan "Suara oleh ElevenLabs" bila tidak diwajibkan lagi.

## Menyiapkan database Supabase

Buka Supabase → SQL Editor, tempel isi `supabase/migrations/0001_init.sql`, lalu Run. Ini membuat:

- tabel `leads` (nama, WhatsApp, ringkasan kebutuhan, transkrip);
- tabel `chat_logs` (obrolan anonim, nomor telepon sudah disamarkan);
- jadwal harian `pg_cron` yang menghapus `chat_logs` berumur lebih dari 90 hari.

Kalau `pg_cron` belum aktif, aktifkan dulu di Database → Extensions.

Lead bisa dilihat di Table Editor → `leads`.

## Deploy ke Vercel

1. Push repo ke GitHub, lalu di vercel.com → Add New Project → import repo ini.
2. Isi semua variabel dari `.env.example` di Settings → Environment Variables.
3. Deploy. Untuk subdomain (misalnya `ai.harakaerfi.com`), tambahkan domain di Vercel lalu minta pengelola DNS harakaerfi.com menambahkan record CNAME yang ditampilkan Vercel.

## Memperbarui pengetahuan Rara

Semua yang Rara tahu tentang Haraka ada di `lib/knowledge/haraka.md`. Begitu tim mengisi brief ("Brief Data AI Haraka Erfi"):

1. Pindahkan jawaban dari brief ke bagian yang sesuai di file itu (MOQ, harga, durasi, FAQ, larangan).
2. Hapus baris yang sudah terjawab dari bagian **"Belum tersedia"**. Angka yang tetap dirahasiakan biarkan di sana, supaya Rara mengarahkan ke sales.
3. Persona (nama, sapaan, gaya bicara) dan aturan jawaban ada di `lib/prompt.ts`.
4. Commit dan deploy ulang.

## Mengganti avatar dengan klip video

Ikuti `docs/avatar-clip-spec.md`: taruh klip di `public/avatar/` lalu ubah `public/avatar/manifest.json` ke `"mode": "clips"`. Kodenya tidak perlu diubah.

**Penting:** `public/avatar/placeholder.jpg` diambil dari gambar referensi milik orang lain. Hanya untuk demo internal, dan wajib diganti sebelum website dibuka ke publik.

## Batas untuk demo

- Maksimal 20 pertanyaan per sesi dan 30 permintaan per menit per IP. Batas ini disimpan di memori server, jadi longgar di Vercel, tapi cukup untuk demo.
- Kalau ElevenLabs gagal atau kuotanya habis, jawaban tetap tampil sebagai teks.
