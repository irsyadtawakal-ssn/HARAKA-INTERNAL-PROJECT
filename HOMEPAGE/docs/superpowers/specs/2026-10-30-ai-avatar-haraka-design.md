# AI Avatar "Rara" — Website Maklon Haraka Erfi

Dokumen desain · 30 Oktober 2026 · status: draft untuk disetujui

## 1. Maksud & alasan

PT Haraka Erfi (unit usaha PT Haraka Multifaedah) adalah pabrik maklon kosmetik di Bekasi, berdiri 2015, berstandar CPKB, dan membantu pengurusan BPOM, Halal, dan HAKI. Website utamanya, harakaerfi.com, adalah halaman statis satu kolom dengan tombol WhatsApp.

Si boss ingin ada **AI avatar berwajah manusia** yang bisa diajak bicara oleh calon klien, entah lewat suara atau ketikan. Avatar ini menjawab pertanyaan seputar maklon Haraka dan dunia kosmetik.

**Tujuan akhirnya adalah lead.** Avatar menjawab dengan meyakinkan, menggali kebutuhan calon klien, lalu meminta kontak supaya tim sales bisa menindaklanjuti. Avatar juga berfungsi sebagai pembeda: calon klien merasa sedang bicara dengan pabrik yang modern.

Calon klien tipikal:
- pemilik brand baru (UMKM, reseller, seleb, klinik) yang belum paham MOQ, legalitas, formulasi, dan biaya;
- pemilik brand yang sudah jalan dan sedang mencari pabrik baru.

## 2. Tujuan, bukan-tujuan, anti-tujuan

**Tujuan**
- Satu halaman yang berdiri sendiri. Pusatnya adalah avatar wajah (kepala sampai bahu) yang terus bergerak dan terasa hidup.
- Interaksi **suara ke suara**: pengunjung bicara lewat mic, avatar menjawab dengan suara dan teks.
- Interaksi **teks ke suara**: pengunjung mengetik, avatar menjawab dengan suara dan teks.
- Jawaban hanya seputar Haraka Erfi dan dunia kosmetik/maklon. Pertanyaan di luar topik diarahkan kembali dengan sopan.
- Lead yang tertangkap (kontak + ringkasan kebutuhan) tersimpan dan sampai ke tim sales.

**Bukan tujuan (untuk versi ini)**
- Versi mobile yang rapi. Fokus **desktop dulu**; mobile menyusul. Di HP halaman cukup tidak rusak (lihat §7).
- Gerak bibir yang sinkron dengan suara (avatar real-time). Ditunda; arsitekturnya harus siap untuk itu (§5.2).
- Mengganti atau mengubah harakaerfi.com. Paling jauh, website utama diberi link ke halaman ini.
- Banyak bahasa. Bahasa Indonesia dulu (menunggu brief F5).
- Panel admin atau CRM. Lead cukup dilihat di Supabase/Google Sheet atau dikirim sebagai notifikasi.

**Anti-tujuan (gagal walau secara teknis jalan)**
- AI mengarang angka: harga, MOQ, durasi, atau nomor sertifikat yang tidak ada di data resmi.
- AI memberi klaim medis atau janji hasil ("putih dalam 3 hari"), atau menjelek-jelekkan kompetitor.
- Avatar terlihat beku, kaku, atau seram (uncanny), sehingga kesan "premium beauty" hilang.
- Pengunjung merasa diinterogasi atau dipaksa mengisi form sebelum mendapat jawaban berguna.
- Kunci API bocor ke browser, atau kuota gratis habis karena bot dalam sehari.

## 3. Batasan

- **Versi pertama = demo internal untuk si boss** (keputusan pemilik). Belum dibuka ke calon klien. Konsekuensinya:
  - paket gratis cukup;
  - atribusi ElevenLabs boleh tampil;
  - perlindungan bot cukup ringan (rate limit sederhana);
  - foto referensi boleh dipakai sebagai placeholder.

  Peluncuran publik adalah tahap terpisah. Tahap itu butuh paket berbayar, wajah dan klip final, isi brief, dan perlindungan bot yang lebih serius.
- **Tidak ada tenggat** (keputusan pemilik). Urutan kerja: demo avatar dulu, lalu fitur lain. Isi brief dimasukkan bertahap begitu tersedia.

- **Gratis dulu:** Vercel (hosting + serverless), Supabase (database), dan ElevenLabs (suara) memakai paket gratis untuk tahap bangun dan demo. Model AI juga harus punya paket gratis untuk tahap ini.
  - Paket gratis ElevenLabs sekitar 10.000 kredit/bulan (±10 menit suara), dan **tidak boleh untuk komersial** (wajib atribusi). Sebelum dibuka ke publik perlu paket berbayar (Starter ±$5–6/bulan, ±30 menit). Semua angka ini perlu dicek ulang di halaman resmi.
- **Berdiri sendiri** di subdomain, misalnya `ai.harakaerfi.com`, terpisah dari codebase harakaerfi.com.
- **Data perusahaan** berasal dari brief yang diisi tim: artifact "Brief Data AI Haraka Erfi" (https://claude.ai/artifact/GitZqgiq1svq9Gh5H6vSQ2), 32 item dalam 7 bagian, tersimpan di koleksi `answers` (dokumen per item, field `text`). Sebelum brief terisi, AI memakai fakta dari harakaerfi.com (lihat Lampiran A).
- **Avatar memakai Opsi 2** (klip video bergantian), bukan avatar streaming berbayar.

## 4. Pengalaman pengguna

### 4.1 Arah visual: "Soft Skin" (dipilih)
- Latar krem-pink lembut, nuansa kampanye beauty. Bukan dark mode, bukan neon.
- Avatar di tengah layar, dibingkai **kepala sampai bahu**. Tidak ultra close-up (sudah dikoreksi pemilik).
- Wajah final: perempuan, kulit porselen, rambut putih/platinum. Referensi ada di folder `REFERENSI MODEL/`. Pilihan akhir menunggu brief G2. Aksen cyborg boleh ada tapi halus; keputusan ini milik pemilik bersama brief G2.
- Fakta perusahaan melayang di sekitar wajah sebagai kartu kaca kecil: 18+ brand partner, 4 kategori produk, 6 tahap, sejak 2015, badge CPKB·BPOM·HALAL.
- Bagian bawah, berurutan: kalimat terakhir avatar (font serif, gaya subtitle), chip pertanyaan cepat, lalu bar input berisi kolom teks + tombol mic.
- Logo HARAKA ERFI di kiri atas.
- Mockup acuan: `.superpowers/brainstorm/669-1793325980/content/soft-skin-v2.html`.
- Referensi website (komposisi, panel kaca, tipografi besar) ada di `REFERENSI WEBSITE/`.

### 4.2 Avatar selalu bergerak — 4 keadaan
| Keadaan | Kapan | Gerakan |
|---|---|---|
| Diam (idle) | default | berkedip, bernapas, sesekali melirik; tidak pernah beku |
| Mendengarkan | mic aktif / pengunjung mengetik | menatap ke depan, sedikit mengangguk, cincin denyut di sekitar |
| Berpikir | menunggu jawaban AI | melirik ke samping, senyum tipis |
| Berbicara | audio jawaban diputar | bibir dan kepala bergerak; 2–3 variasi klip supaya tidak terasa berulang |

Perpindahan antarklip memakai crossfade supaya tidak terlihat "lompat". Amplitudo audio boleh dipakai untuk efek halus, misalnya cincin atau cahaya.

### 4.3 Alur percakapan → lead
1. **Sapaan:** saat halaman dibuka, avatar dalam keadaan idle dan menampilkan sapaan sebagai teks. Suara baru diputar setelah pengunjung berinteraksi, karena browser memblokir autoplay audio. Tombol "Mulai ngobrol" boleh memicu sapaan bersuara.
2. **Tanya-jawab:** jawaban singkat (2–4 kalimat), bisa diucapkan, gaya bicara sesuai persona di brief A2. Contoh sementara: nama "Rara", sapaan "Kak", ramah dan profesional.
3. **Menggali kebutuhan:** sambil menjawab, avatar menanyakan jenis produk, target jumlah, budget kasar, dan target launching secara natural. Satu pertanyaan per giliran.
4. **Momen tangkap lead:** saat ada sinyal niat (bertanya harga/MOQ/estimasi, atau setelah ±3–4 pertanyaan), avatar menawarkan estimasi atau konsultasi gratis dan meminta nama + nomor WhatsApp. Pengunjung bisa menyebutnya lewat suara atau mengisi form kecil yang muncul di layar. Field final mengikuti brief F1.
5. **Penutup:** konfirmasi bahwa tim akan menghubungi (waktu respons sesuai brief F3), plus tombol "Chat WhatsApp sekarang" ke nomor CS.
6. **Data lead:** kontak + ringkasan kebutuhan (diringkas AI) + transkrip disimpan, lalu diteruskan ke tujuan di brief F2.

### 4.4 Aturan jawaban
- Angka yang ada di brief dipakai apa adanya. Angka yang ditandai "rahasia" atau belum ada → jawab secara umum, lalu arahkan ke sales. Pola ini sekaligus jadi pemicu lead.
- Klaim produk wajib aman secara regulasi kosmetik BPOM. Tanpa saran medis.
- Pertanyaan di luar topik → dijawab singkat lalu diarahkan kembali ke kosmetik/maklon.
- Daftar larangan final mengikuti brief C4 dan F4.

## 5. Bagian "bagaimana" yang sudah diputuskan

### 5.1 Tumpukan teknologi
- **Hosting & server:** Vercel (gratis). Kunci API hanya ada di server (serverless function), tidak pernah di browser.
- **Database:** Supabase (gratis) untuk lead dan log percakapan.
- **Suara AI (teks → suara):** ElevenLabs, satu suara perempuan berbahasa Indonesia. Karakter suara menunggu brief G3.
- **Suara pengunjung (suara → teks):** *keputusan Claude* — Web Speech API bawaan browser (Chrome/Edge desktop, `id-ID`). Gratis dan tidak memakai kredit ElevenLabs. Di browser yang tidak mendukung, tombol mic disembunyikan dan pengunjung mengetik.
- **Otak AI:** *keputusan Claude* — model bahasa yang punya paket gratis untuk tahap bangun. Builder memilih dengan syarat: bagus berbahasa Indonesia, mendukung streaming, dan bisa diganti lewat konfigurasi.

### 5.2 Avatar = komponen yang bisa ditukar
- Avatar dibangun sebagai satu komponen dengan antarmuka keadaan (`idle | listening | thinking | speaking`) ditambah masukan audio.
- Implementasi sekarang: pemutar klip video (Opsi 2). Nanti bisa ditukar ke avatar streaming real-time (HeyGen LiveAvatar / Tavus / D-ID, dll.) tanpa menyentuh chat, suara, atau lead.
- **Klip video final dibuat oleh pemilik proyek** (keputusan pemilik). Detail tools dan cara membuatnya akan dibahas terpisah.
- Tugas builder untuk klip:
  - menulis **spesifikasi klip**: daftar klip per keadaan, durasi, resolusi, format, titik loop, dan posisi kepala yang konsisten supaya crossfade mulus;
  - membuat pemutar klip yang cukup diberi file baru tanpa mengubah kode;
  - menyiapkan placeholder sederhana dari gambar referensi untuk demo internal, misalnya gambar diam dengan animasi napas, kedip, dan cincin.

### 5.3 Pengetahuan AI
- Sumber pengetahuan: Lampiran A (fakta website) + isi brief tim. Isi brief disalin ke file pengetahuan di repo (bukan dibaca langsung saat runtime) supaya bisa direview dan diversikan.
- Prompt sistem memuat persona, aturan §4.4, dan pengetahuan tersebut. Volumenya kecil, jadi belum perlu RAG/vector DB.

### 5.4 Keputusan Claude (hasil review, boleh dikoreksi pemilik)
- **Lead:** sampai brief F2 terisi, lead disimpan di Supabase dan dikirim sebagai notifikasi email ke alamat sales. WhatsApp API tidak dipakai di versi ini karena butuh layanan berbayar atau persetujuan WA Business.
- **Log & persetujuan (UU PDP):** percakapan anonim disimpan tanpa data pribadi untuk evaluasi jawaban AI, maksimal 90 hari. Transkrip lengkap hanya disimpan bersama lead. Sebelum nama dan nomor disimpan, tampil satu baris persetujuan singkat ("Dengan mengirim, Kakak setuju dihubungi tim Haraka Erfi") beserta link kebijakan privasi sederhana. Bukan checkbox panjang.
- **Gambar referensi hanya untuk demo internal.** Gambar di `REFERENSI MODEL/` adalah karya orang lain, jadi tidak boleh dipakai di versi publik. Wajah final harus dibuat atau dimiliki Haraka sendiri (brief G2).
- **Perlindungan untuk demo:** cukup rate limit per IP dan batas jumlah giliran per sesi. Tanpa captcha.
- **Uji klip berbicara lebih awal:** milestone pertama adalah demo avatar 4 keadaan dengan suara, untuk ditunjukkan ke si boss sebelum fitur lain dibangun. Tujuannya memastikan gerak bibir yang tidak sinkron masih bisa diterima. Klip berbicara dibuat dengan gerak mulut halus, bukan artikulasi lebar.

## 6. Yang diserahkan ke builder
- Framework front-end dan struktur kode. Next.js adalah pilihan wajar untuk Vercel, tapi tidak wajib.
- Pilihan model AI konkret dalam batasan §5.1.
- Skema tabel Supabase, cara notifikasi lead (WA/email/Sheet) sesuai brief F2, dan perlindungan dari spam/bot (rate limit, batas panjang sesi, captcha ringan bila perlu) supaya kuota gratis tidak terkuras.
- Tipografi dan detail visual dalam arah §4.1.
- Teknik crossfade dan pemilihan klip berbicara.
- Cara menangani ElevenLabs yang gagal atau kuota habis: jawaban tetap tampil sebagai teks, avatar tetap dalam keadaan "berbicara" sejenak.

## 7. Tampilan di HP (sementara)
Versi mobile yang sebenarnya menyusul. Untuk sekarang, halaman harus tetap bisa dipakai di HP: layout satu kolom, avatar di atas, input di bawah, tanpa scroll horizontal. Tidak perlu dipoles.

## 8. Ketergantungan & hal terbuka
- **Brief tim** (item wajib) belum terisi. Sebelum terisi, AI hanya memakai Lampiran A dan menjawab hal komersial secara umum.
- **Wajah avatar final** (G2) dan **karakter suara** (G3) belum ada. Pembuatan klip final oleh pemilik proyek akan dibahas terpisah. Untuk demo, builder memilih sementara voice perempuan berbahasa Indonesia dari pustaka ElevenLabs.
- **Paket berbayar ElevenLabs** dan model AI baru dibutuhkan saat dibuka ke publik, bukan untuk demo. Keputusan dan biayanya ada di tangan si boss.
- **Subdomain** perlu ditambahkan oleh pengelola DNS harakaerfi.com.

## Lampiran A — Fakta dari harakaerfi.com (dibaca 30 Okt 2026)
- PT Haraka Erfi, unit usaha PT Haraka Multifaedah. Nama badan hukum di website tidak konsisten; tunggu brief A1.
- Tagline: "Bangun Brand Kosmetikmu. Kami Urus Selebihnya." / "Partner Maklon dari Ide Hingga Produk Siap Jual."
- Kategori:
  - Skincare (cleanser, toner, serum, moisturizer, sunscreen, masker, essence)
  - Bodycare (lotion, scrub, hand cream, body wash, body butter)
  - Parfum (EDP, EDT, body mist, cologne, scented spray)
  - Haircare (shampoo, conditioner, hair serum, hair mask, hair tonic, hair oil)
- Layanan: formulasi R&D & sampel; konsep & desain produk (logo, kemasan, branding); solusi kemasan & sourcing; manufaktur CPKB + QC.
- Legalitas: notifikasi BPOM, sertifikasi Halal (MUI/BPJPH), pendaftaran merek (HAKI). Badge: BPOM, Halal, CPKB, ISO 22716.
- Keunggulan: respons cepat, formula bebas dikustom, MOQ fleksibel untuk UMKM (tanpa angka), benefit partner (prioritas antrian, diskon volume bertahap, konsultasi), pendampingan bisnis A–Z.
- 6 tahap: konsultasi → formula & sampel → approval → registrasi BPOM/Halal → produksi CPKB → QC & pengiriman.
- Sejak 2015. Portofolio 18 brand, antara lain Ascha Beauty, Nature Reaction, EpelSkin, Hassya Premiere. Brand mana yang boleh disebut menunggu brief E1.
- Kontak: Jl. Raya Cimatis No. 80, Jatikarya, Jatisampurna, Bekasi · WA CS 0831-3703-0656 · 021-39733633 · info@harakamultifaedah.co.id.
- Belum ada di website: angka MOQ, harga, durasi, jawaban FAQ, testimoni, media sosial.
