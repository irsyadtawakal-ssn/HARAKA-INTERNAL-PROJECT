---
name: google-flow-autopilot
description: Skill khusus untuk Generate Video Otomatis (100% Hands-Free Autopilot) di Google Flow (flow.google.com / labs.google) menggunakan Chrome Extension Bridge (extension/) & Standalone CLI (flow-autopilot-cli.mjs) — mulai dari auto-set Video + Frames + 9:16 + 720p + durasi + x2, auto-upload foto ke slot Start via Add to prompt, auto-inject prompt ke ProseMirror, auto-select kandidat terbaik, hingga auto-download 720p berantai (Hook -> CTA).
---

# ⚡ SKILL: GOOGLE FLOW FULL AUTOPILOT EXTENSION (`google-flow-autopilot`)

Skill ini adalah paket **100% Portable & Mandiri (Standalone)** untuk mengotomatiskan pembuatan video Veo 3.1 di **Google Flow (`https://flow.google.com` / `labs.google`)**. Seluruh kode Chrome Extension dan script CLI sudah berada di dalam satu folder yang sama sehingga bisa langsung di-copy dan dipakai oleh orang lain atau project/agent lain tanpa butuh Dashboard utama.

---

## 📂 Struktur File di Dalam Folder Skill Ini

Semua file kode yang dibutuhkan sudah tersimpan di dalam folder yang sama:
- **`SKILL.md`**: Dokumentasi & panduan teknis autopilot ini.
- **`flow-autopilot-cli.mjs`**: Script Node.js mandiri (*zero-dependency*) untuk menjalankan autopilot lewat terminal/agent lain tanpa butuh dashboard besar.
- **`extension/`** *(Folder Chrome Extension Siap Load Unpacked)*:
  - **`manifest.json`**: Konfigurasi Chrome Extension Manifest V3 (`tabs`, `downloads`, `storage`).
  - **`background.js`**: *Never-Sleep Service Worker* yang menjembatani Popup UI, Server CLI (`localhost:3210`), dan verifikasi/fallback unduhan Chrome.
  - **`content.js`**: Mesin DOM Autopilot di `flow.google.com` (auto-settings, auto-upload Start frame, auto-prompt ProseMirror, auto-evaluate kandidat terbaik, dan auto-download 720p berantai).
  - **`popup.html` & `popup.js`**: Antarmuka Popup interaktif di Chrome (bisa pilih foto + ketik prompt Video 1 & Video 2 + klik tombol **Jalankan Autopilot** langsung dari browser tanpa server sama sekali!).

---

## 🚀 2 Cara Pakai (Bisa Dipakai Siapa Saja / Project Lain)

### Cara A: Mode 100% Mandiri Lewat Popup Chrome (Tanpa Terminal/Server)
1. Buka Google Chrome $\rightarrow$ ketik `chrome://extensions/` $\rightarrow$ nyalakan **Developer mode**.
2. Klik **Load unpacked** $\rightarrow$ pilih subfolder **`extension`** yang ada di dalam folder skill ini.
3. Buka tab `https://flow.google.com` dan masuk ke halaman project Flow.
4. Klik ikon extension **⚡ Google Flow Autopilot** di pojok kanan atas Chrome:
   - Pilih **Foto Referensi Start Frame (`.jpg`/`.png`)**.
   - Isi **Prompt Video 1 / Hook** (taruh dialog di dalam tanda kutip `"..."`).
   - *(Opsional)* Isi **Prompt Video 2 / CTA** jika ingin generate 2 video berantai sekaligus.
   - Klik tombol **"🚀 Jalankan Autopilot & Auto-Download 720p"**.

### Cara B: Mode Otomatis Lewat Terminal / AI Agent Lain (`flow-autopilot-cli.mjs`)
Cocok kalau mau dipanggil otomatis oleh AI Agent (Claude Code / Cursor / Antigravity) atau script Node.js:
```bash
# Generate 1 Video + Auto-Download 720p:
node flow-autopilot-cli.mjs --photo "./foto_avatar.jpg" --prompt "Medium close-up vertical 9:16 video... He says: \"Halo semuanya!\""

# Generate 2 Video Berantai (Video 1 selesai download -> otomatis lanjut Video 2):
node flow-autopilot-cli.mjs --photo "./foto_avatar.jpg" --prompt "Prompt Video 1..." --cta "Prompt Video 2..."

# Paksa Download 720p Video Terbaik yang Sudah Ada di Layar Sekarang:
node flow-autopilot-cli.mjs --downloadNow
```

---

## ⚙️ Urutan 7 Langkah Autopilot di `extension/content.js` (`runFullFlowPipeline`)

Setiap kali tugas masuk (baik dari Popup maupun dari `flow-autopilot-cli.mjs`), `content.js` mengeksekusi 7 langkah berikut secara otomatis:

1. **Pembersihan Seleksi Canvas & Lapor Slot (`/api/flow-slot`)**:
   - Menekan tombol `Close` atau mengirim event `Escape` bila ada gambar terpilih di canvas agar tidak terjebak di mode edit gambar *Nano Banana*.
2. **Konfigurasi Menu Settings (`configureFlowSettings`)**:
   - Menghitung durasi otomatis (`computeTargetDuration`) dari jumlah kata di dalam tanda kutip:
     - $\le 9$ kata $\rightarrow$ **`4s`** | $\le 14$ kata $\rightarrow$ **`6s`** | $\le 21$ kata $\rightarrow$ **`8s`** | $> 21$ kata $\rightarrow$ **`10s`**.
   - Membuka menu setting dan mengklik berurutan: **`Video`** $\rightarrow$ **`Frames`** *(WAJIB `Frames`, DILARANG `Ingredients`!)* $\rightarrow$ **`9:16`** $\rightarrow$ **`720p`** $\rightarrow$ **Durasi** $\rightarrow$ **`x2`**.
3. **Upload Foto Referensi & Tunggu `0% -> 100%` (`uploadAvatarAndWaitUntil100PercentDone`)**:
   - Mengambil file dari `avatarUrl` (mendukung URL `http://localhost:3210/...` maupun `data:image/jpeg;base64,...` langsung dari Popup).
   - Mengklik tombol slot **`Start`**, menyuntikkan file ke `<input type="file">` via `DataTransfer`, lalu memantau persentase loading hingga `100%` selesai dan gambar tidak blur.
4. **Kunci Foto ke Slot `[Start]` via `Add to prompt` (`selectImageAndClickAddToPrompt`)**:
   - Hanya mencari thumbnail di dalam modal `Select a frame image` (`getFramePickerModal()`), otomatis membuka tab `Uploads` bila perlu, mengklik foto yang baru diupload, lalu menekan tombol putih **`Add to prompt`** (`findAddToPromptButton()`).
   - **Hard Guard (`isStartFrameSet`)**: Memverifikasi slot `[Start]` benar-benar sudah berisi thumbnail foto sebelum lanjut (dilarang keras menekan Generate jika slot `[Start]` masih kosong).
5. **Suntikkan Prompt ke Editor (`fillProseMirrorPrompt`)**:
   - Mengosongkan `div.ProseMirror[contenteditable="true"]` dari teks lama dan menyuntikkan teks prompt baru hingga bersih.
6. **Klik Tombol Panah Putih Generate (`clickWhiteArrowGenerateButton`)**:
   - Mencatat baseline video lama (`captureVideoBaseline()`) lalu menekan tombol panah bulat putih (`→`).
7. **Auto-Evaluate & Auto-Download 720p (`waitAndAutoSelectBestVideo720p`)**:
   - Menunggu 2 kandidat video baru selesai dibuat, menilai kualitas visual & kestabilan frame (`scoreVideoCandidateFast`), memilih pemenangnya, lalu mengklik titik tiga (**`⋮`**) $\rightarrow$ **`Download ▶`** $\rightarrow$ **`720p (Original size)`**.
   - Dilengkapi verifikasi `chrome.downloads` di `background.js` (jika klik menu UI gagal memicu unduhan Chrome, otomatis mengunduh langsung dari `video.src` menggunakan `chrome.downloads.download`).
   - Jika ada `ctaPrompt`, dalam `800ms` setelah unduhan pertama dimulai, otomatis lanjut men-generate & men-download video kedua!
