---
name: google-flow-autopilot
description: Skill khusus untuk Generate Video Otomatis (100% Hands-Free Autopilot) di Google Flow (flow.google.com / labs.google) menggunakan Chrome Extension Bridge (extension-google-flow) — mulai dari auto-set Video + Frames + 9:16 + 720p + durasi + x2, auto-upload foto ke slot Start via Add to prompt, auto-inject prompt ke ProseMirror, auto-select kandidat terbaik, hingga auto-download 720p berantai (Hook -> CTA).
---

# ⚡ SKILL: GOOGLE FLOW FULL AUTOPILOT EXTENSION (`google-flow-autopilot`)

> **Fokus Skill**: Dokumentasi & cetak biru teknis khusus untuk **Generate Video Otomatis (100% Hands-Free Autopilot) di Google Flow (`flow.google.com` / `labs.google`) menggunakan Chrome Extension Bridge**.
> **Folder Extension**: [extension-google-flow/](file:///c:/Users/USER/Documents/AI%20VIDIO%20OTOMATIS/extension-google-flow)
> **File Utama**: [manifest.json](file:///c:/Users/USER/Documents/AI%20VIDIO%20OTOMATIS/extension-google-flow/manifest.json) | [background.js](file:///c:/Users/USER/Documents/AI%20VIDIO%20OTOMATIS/extension-google-flow/background.js) | [content.js](file:///c:/Users/USER/Documents/AI%20VIDIO%20OTOMATIS/extension-google-flow/content.js) | [popup.html](file:///c:/Users/USER/Documents/AI%20VIDIO%20OTOMATIS/extension-google-flow/popup.html)

---

## 1. Arsitektur Jembatan Otomatis (Dashboard $\leftrightarrow$ Extension $\leftrightarrow$ Google Flow)

Sistem ini mengotomatiskan seluruh proses pembuatan video di `https://flow.google.com` tanpa perlu klik manual dari user:

- `content.js` di tab `flow.google.com` mengirimkan **Heartbeat aktif setiap `1.2 detik`** (`chrome.runtime.sendMessage({ action: 'POLL_QUEUE' })`) ke `background.js` supaya Service Worker Chrome Manifest V3 **tidak pernah tidur** (*Unlimited Runs*).
- `background.js` mengecek antrean tugas baru di `http://localhost:3210/api/flow-queue`.
- Begitu ada tugas masuk, `content.js` menjalankan `runFullFlowPipeline` secara otomatis dari pengaturan sampai download 720p selesai.

---

## 2. Format Payload Tugas (`/api/flow-queue`)

```json
{
  "time": 1793450000000,
  "deliverableId": "deliv-123456",
  "slot": "hook",
  "avatarFile": "nama_file_referensi.jpg",
  "avatarUrl": "http://localhost:3210/api/avatar/nama_file_referensi.jpg",
  "prompt": "Medium close-up vertical 9:16 video of... He says: \"Kalimat dialog pembuka di sini\"",
  "ctaPrompt": "Medium close-up vertical 9:16 video of... He says: \"Kalimat dialog penutup di sini\""
}
```
- Jika `ctaPrompt` disertakan saat `slot: "hook"`, maka `800ms` setelah video **Hook 720p** selesai terdownload, extension **otomatis lanjut** men-generate dan men-download video **CTA 720p**.
- Untuk memicu download instan pada video yang sudah ada di layar, kirimkan `{ "action": "DOWNLOAD_NOW", "time": 1793450000000 }`.

---

## 3. Urutan 7 Langkah Autopilot di `content.js` (`runFullFlowPipeline`)

1. **Pembersihan Seleksi Canvas & Lapor Slot (`/api/flow-slot`)**:
   - Menekan `Close` / `Escape` bila ada gambar terpilih di canvas agar tidak masuk ke mode *Nano Banana*.
2. **Konfigurasi Menu Settings (`configureFlowSettings`)**:
   - Menghitung durasi otomatis (`computeTargetDuration`) dari total kata **semua dialog** (kutipan yang klausanya memuat kata kerja bicara: says, replies, counts, berkata, …; teks layar dalam kutip tidak dihitung) (`<=9` kata: `4s`, `<=14` kata: `6s`, `<=21` kata: `8s`, `>21` kata: `10s`).
   - Membuka menu setting dan memilih: **`Video`** $\rightarrow$ **`Frames`** *(WAJIB `Frames`, DILARANG `Ingredients`!)* $\rightarrow$ **`9:16`** $\rightarrow$ **`720p`** $\rightarrow$ **Durasi (`4s`/`6s`/`8s`/`10s`)** $\rightarrow$ **`x2`**.
3. **Upload Foto Referensi & Tunggu `0% -> 100%` (`uploadAvatarAndWaitUntil100PercentDone`)**:
   - Mengambil file dari `avatarUrl`, mengklik tombol slot **`Start`**, menyuntikkan file ke `<input type="file">` via `DataTransfer`, lalu menunggu indikator `%` selesai (`100%`) dan gambar tidak blur.
4. **Kunci Foto ke Slot `[Start]` via `Add to prompt` (`selectImageAndClickAddToPrompt`)**:
   - Hanya mencari thumbnail di dalam modal `Select a frame image` (`getFramePickerModal()`), otomatis membuka tab `Uploads` bila perlu, mengklik foto, lalu menekan tombol putih **`Add to prompt`** (`findAddToPromptButton()`).
   - **Hard Guard (`isStartFrameSet`)**: Memverifikasi slot `[Start]` benar-benar sudah berisi thumbnail foto sebelum lanjut.
5. **Suntikkan Prompt ke Editor (`fillProseMirrorPrompt`)**:
   - Mengosongkan `div.ProseMirror[contenteditable="true"]` dari teks lama dan menyuntikkan prompt baru hingga bersih.
6. **Klik Tombol Panah Putih Generate (`clickWhiteArrowGenerateButton`)**:
   - Mencatat baseline video lama (`captureVideoBaseline()`) lalu menekan tombol panah bulat putih (`→`).
7. **Auto-Evaluate & Auto-Download 720p (`waitAndAutoSelectBestVideo720p`)**:
   - Menunggu 2 kandidat video baru selesai dibuat, memilih kandidat terbaik (`scoreVideoCandidateFast`), mengklik titik tiga (**`⋮`**) $\rightarrow$ **`Download ▶`** $\rightarrow$ **`720p (Original size)`**, serta memverifikasi unduhan lewat `chrome.downloads` di `background.js` (dengan fallback unduh langsung URL video jika klik UI gagal).
