---
name: google-flow-omni-prompting
description: Menulis dan mereview naskah iklan video pendek (< 30 detik, hook/body/CTA) dan prompt video Google Flow untuk model Gemini Omni 1.1 Flash — prompt scene, edit video-to-video, start/end frame, scene extension, serta character sheet (blok identitas + turnaround/expression sheet Nano Banana) untuk konsistensi karakter. Gunakan saat diminta membuat naskah/hook iklan TikTok/Reels/Shorts, membuat, memperbaiki, atau mengecek prompt Flow/Omni, atau menyiapkan karakter untuk video AI.
---

# Google Flow — Omni 1.1 Flash Prompting

- Prompt, character sheet, template, dan sumber: [references/panduan-lengkap.md](references/panduan-lengkap.md). Baca sebelum menulis prompt.
- Naskah iklan < 30 detik (struktur per durasi, bank hook, CTA, contoh, pemecahan ke klip): [references/naskah-iklan.md](references/naskah-iklan.md). Baca sebelum menulis naskah.

## Cara kerja

0. **Naskah dulu** bila iklannya belum punya naskah: pilih durasi dan framework, tulis 3–5 variasi hook, satu body, satu CTA, lalu pecah ke klip Hook/CTA (atau 3 klip untuk 30 detik) sesuai `naskah-iklan.md` §7.
1. **Tentukan jenis prompt:** scene baru, edit, start→end frame, extension, atau character sheet.
2. **Karakter dulu.** Kalau ada karakter berulang dan belum ada sheet-nya, buat **blok identitas** lengkap (§11) lalu prompt turnaround sheet untuk Nano Banana. Character sheet ditulis **sangat detail**; prompt video ditulis **singkat**. Ikuti tabel rasio per aset, buat set + start frame 9:16, dan untuk karakter realistis ikuti tips di §11.
3. **Tulis prompt video** dengan template §12:
   - Bahasa Inggris, ±30–80 kata, 1–2 aksi per klip.
   - Deklarasikan referensi dengan tag (`<IMAGE_REF_0>`, `<FIRST_FRAME>`, …). Jangan deskripsikan ulang penampilan yang sudah ada di gambar.
   - Satu baris pengunci identitas: `Keep <ciri kunci> exactly as in the reference.`
   - Salin deskripsi suara kata per kata dari blok identitas.
   - `One continuous shot` bila perlu satu take; `Sound design: ...`; larangan ditulis eksplisit (tidak ada kolom negative prompt).
4. **Edit:** satu perubahan per langkah + `Keep everything else the same.`
5. **Cek** dengan checklist §13 sebelum menyerahkan prompt.

## Aturan khusus proyek ini

- Extension autopilot (`skill google flow.md`, skill `google-flow-autopilot`) menghitung durasi klip dari total kata **semua dialog** (kutipan yang klausanya memuat kata kerja bicara: says, replies, counts, berkata, …; teks layar dalam kutip tidak dihitung): ≤9 → 4s, ≤14 → 6s, ≤21 → 8s, >21 → 10s. Untuk prompt lewat autopilot, **dialog wajib dalam tanda kutip dan diawali kata kerja bicara** (`He says ...: "..."`), dan panjangnya disesuaikan dengan durasi target.
- Autopilot memakai mode **Video → Frames** dan mengirim **satu gambar per klip** ke slot **Start** (mode Ingredients dilarang). Untuk prompt autopilot: buat **start frame 9:16 per klip** dari potret master + set (panduan §11), pakai template **A2** (§12) yang diawali `Use the image as the starting frame.`, tanpa `[# References …]` dan tanpa `@Nama`. Character sheet hanya bahan membuat start frame, tidak ikut terkirim.
- Format default konten: vertikal 9:16, 720p.

## Jangan

- Memakai kebiasaan Veo (negative prompt field, spesifikasi ISO/f-stop, prompt panjang).
- Menumpuk banyak event dalam satu klip 10 detik.
- Memakai `<LAST_FRAME>` tanpa `<FIRST_FRAME>`.
- Menyajikan klaim **[komunitas]** sebagai aturan resmi Google.
