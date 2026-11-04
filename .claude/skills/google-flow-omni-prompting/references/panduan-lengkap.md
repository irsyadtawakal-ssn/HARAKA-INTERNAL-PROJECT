# Panduan Prompting Google Flow — Gemini Omni 1.1 Flash

Dirangkum dari panduan resmi Google (DeepMind, Gemini API docs, akun X @FlowbyGoogle) dan sumber komunitas (GitHub, blog). Poin yang hanya berasal dari pihak ketiga ditandai **[komunitas]** — uji dulu di Flow sebelum dijadikan standar.

Riset: 4 November 2026.

---

## 1. Prinsip dasar

- Susun prompt dari 5 elemen: **framing & gerak kamera, gaya, pencahayaan, lokasi, aksi**. Lokasi cukup singkat — Omni mengisi detail dari intent.
- Satu klip 10 detik = **1–2 aksi utama**. Banyak event dalam satu klip bikin hasil macet atau melenceng.
- Panjang ideal ±30–80 kata **[komunitas]**. Prompt bekas Veo biasanya perlu dipangkas 40–60%.
- Beri batasan kreatif tingkat tinggi, jangan micro-manage setiap elemen (saran resmi Google Flow).
- Omni default-nya multi-shot. Untuk satu take: `One continuous shot, no jump cuts` atau `oner`.
- Jangan tulis spesifikasi teknis kamera (ISO, f-stop) **[komunitas]**.
- Bahasa prompt: **Inggris** (bahasa yang diuji Google). Dialog boleh bahasa Indonesia.

## 2. Kamera

Kosakata dari contoh resmi: `one continuous shot`, `oner`, `static`, `locked off`, `fixed`, `push in`, `punch in`, `dolly zoom`, `whip-pan`, `natural smartphone zoom`, `film camera`, `webcam style`.

- Urutan shot boleh ditulis berurutan: `close-up on his shoes, quickly tilting up to medium shot, then widening`.
- Sudut kamera yang rumit belum didukung resmi; hasilnya bisa tidak konsisten.

## 3. Timing

- Kalimat natural: `After 3 seconds, a woman enters the scene.`
- Atau beat bertimecode: `[0-3s] ... / [3-6s] ... / [6-10s] ...`
- Timecode cocok untuk koreografi/beat-sync. Scene sederhana sering lebih bersih tanpa timecode.

## 4. Audio & dialog

- Audio dibuat bersamaan dengan video. Tulis baris `Sound design: ...` + `no music` / `no dialogue` sesuai kebutuhan.
- **Dialog — dua versi yang bertentangan:**
  - [komunitas] Pakai titik dua tanpa kutip: `She says: Pagi, Mas!` — kutip disebut bikin teks muncul di layar.
  - Contoh resmi DeepMind memakai kutip: `replies: "Did your father go out on the boat too?"`
  - ⚠️ **Proyek ini:** extension autopilot (`skill google flow.md`) menghitung durasi klip dari jumlah kata **di dalam tanda kutip** (≤9 kata → 4s, ≤14 → 6s, ≤21 → 8s, >21 → 10s). Selama pipeline itu dipakai, **tetap tulis dialog dalam tanda kutip**, atau sesuaikan dulu `computeTargetDuration`.
- Dialog yang lebih panjang dari durasi klip akan terpotong.
- Upload audio sebagai referensi tidak didukung; audio di video referensi diabaikan.
- Konsistensi suara: salin deskripsi suara **kata per kata** di setiap prompt.

## 5. Teks di layar

- Tulis teks persis dalam tanda kutip + posisi, animasi, gaya.
- Pola kinetic text: `word by word, one word on screen at a time: [kata-kata], each word appears with a different animated style, perfect pacing to a rhythm.`
- Tambahan legibility **[komunitas]**: `Crystal clear text`, `Only one item and lower third at a time`.
- Akurasi teks tidak dijamin, terutama huruf non-Latin.

## 6. Edit video → video

- Satu perubahan per langkah: `Change the butterfly to a bee.`
- Selalu akhiri dengan: **`Keep everything else the same.`**
- Edit pendek bekerja untuk lighting, gaya, kamera, lokasi: `Make this video anime.` / `Change the lighting to be more dramatic.` / `Make the phone invisible.`
- Edit terlalu deskriptif → perubahan yang tidak diinginkan.
- Drift mulai setelah ±3–4 putaran edit **[komunitas]**. Satu video sumber per edit.

## 7. Referensi (ingredients) & frame

- Tag: `<FIRST_FRAME>`, `<LAST_FRAME>`, `<IMAGE_REF_0>`, `<VIDEO_REF_0>` (N mulai dari 0).
- Deklarasi di awal prompt, contoh: `[# References <IMAGE_REF_0>@Image1]` atau `[# Sources <FIRST_FRAME>@Image1 <LAST_FRAME>@Image2]`.
- Image-to-video: **jelaskan gerakannya saja**, jangan deskripsikan ulang penampilan di gambar.
- `<LAST_FRAME>` harus berpasangan dengan `<FIRST_FRAME>`. Gambar awal = akhir → video loop.
- Start & end frame mengunci komposisi dan palet sebelum kamera bergerak (saran resmi).
- Referensi video: maks 3, masing-masing ≤3 detik **[komunitas]**.
- Warna: lampirkan swatch warna polos — lebih ampuh dari deskripsi kata **[komunitas]**.

## 8. Scene extension

- Perpanjang per 10 detik, maks total 40 detik. Cukup tulis apa yang terjadi berikutnya.
- Timecode di prompt extension mulai lagi dari 0s (`After 2s` = detik ke-12 total).
- Ganti shot: `Show the same characters in the next scene.`
- Video upload yang sudah berisi dialog tidak bisa diperpanjang dengan dialog baru.

## 9. Batas teknis

- Durasi Flow: 4 / 6 / 8 / 10 detik **[komunitas]**; API: 3–10 detik, 24 FPS.
- Rasio: 16:9 (default) dan 9:16. Tidak ada 1:1.
- Resolusi: 360p, 720p, 1080p, 4k (upscale). Draft di resolusi rendah, render ulang yang terbaik.
- **Tidak ada** kolom negative prompt, seed, atau temperature. Tulis larangan langsung di prompt: `No dialogue.` / `No text overlay on screen.` / `No scene cuts.`

## 10. Workflow transisi (resmi @FlowbyGoogle)

1. Prompt scene (karakter, lingkungan, gerakan) → pilih yang terbaik.
2. Generate 4–6 gambar dari sudut lain (close-up, low angle).
3. Ganti model ke Omni 1.1 Flash.
4. Kalimat 1 = aksi; kalimat 2 = gaya transisi (fade, glitch, fast zoom).

---

## 11. Character sheet

Google belum menerbitkan template resmi. Alur resmi Flow: buat karakter di **tab Character** → generate gambar referensi untuk mengunci detail → pakai gambar itu di prompt scene.

### Alur

1. **Potret master** — tajam, menghadap depan, cahaya netral, background polos.
2. **Turnaround sheet** (Nano Banana) dari potret master.
3. **Expression sheet** (opsional) untuk karakter yang bicara.
4. Simpan di tab Character, panggil dengan `@NamaKarakter`.
5. Lampirkan sheet di setiap klip; gambar pertama paling berpengaruh.

### Tingkat detail

| Prompt | Model | Detail |
|---|---|---|
| Character sheet | Nano Banana | **Sangat detail** — yang tidak ditulis akan dikarang model |
| Video scene | Omni 1.1 | **Singkat** — penampilan diambil dari referensi |

### Blok identitas karakter (isi semua field)

```
CHARACTER: <Nama>
- Age & build: <umur>, <etnis>, <tinggi>, <postur>
- Skin: <warna kulit>, <tekstur>, <ciri: tahi lalat/bintik>
- Face: <bentuk wajah>, <mata: bentuk + warna>, <alis>, <hidung>, <bibir>
- Hair: <panjang>, <tekstur>, <warna>, <belahan: kiri/kanan>, <gaya>
- Outfit: <item + warna (hex) + bahan>, no logo; <bawahan>; <alas kaki>
- Accessories: <item + SISI tubuh (kanan/kiri)>
- Makeup: <tingkat>
- Voice: <karakter suara>, <pitch>, <aksen>, <tempo bicara>
- Mannerisms: <kebiasaan gerak>
- Style: <photorealistic / animasi>, <color grade>
```

Yang sering terlupa:
- **Ciri asimetris** (anting satu sisi, belahan rambut) — tulis sisinya, sering terbalik.
- **Hex warna + bahan** — "mustard" bisa jadi oranye/krem.
- **`no logo, no text`** di pakaian.
- **Voice & mannerisms** — tidak terlihat di sheet, tapi penting untuk Omni.

### Prompt turnaround sheet

```
Character reference sheet of <Nama> (description above). Layout on one wide canvas:
top row — full-body front, three-quarter, side profile, back view, all same scale
and camera height; bottom row — close-up portraits: neutral, smiling, surprised,
plus detail crops of <aksesori/sepatu>.
Plain light-grey seamless background, soft even studio lighting, no shadows on
the background, no text, no labels, no props. Identical face, hair, outfit,
and colors in every panel.
```

Versi dari foto referensi: awali dengan `Create a professional character turnaround sheet based strictly on the uploaded reference image.`

### Prompt expression sheet

```
Create a six-panel expression sheet of the referenced character, head and
shoulders: neutral, happy, worried, angry, surprised, laughing. Keep facial
proportions, eyes, nose, mouth shape, hairstyle, age, outfit, camera distance,
lighting, and art style identical in every panel. Plain background.
```

---

## 12. Template prompt video

**A. Single take dengan karakter**
```
[# References <IMAGE_REF_0>@<Nama>Sheet]
@<Nama> <aksi 1>, <aksi 2>.
<Shot>, <gerak kamera>, <pencahayaan>. One continuous shot.
Keep <ciri kunci 1>, <ciri kunci 2>, and <outfit> exactly as in the reference.
She says in a <deskripsi suara persis dari blok identitas>: "<dialog>"
Sound design: <ambience>, no music.
```

**B. Edit surgical**
```
<Change X to Y / Make X invisible>. Keep everything else the same.
```

**C. Beat bertimecode**
```
[0-3s] <beat 1>. [3-6s] <beat 2>. [6-10s] <beat 3>.
<Shot & kamera>. Sound design: <...>.
```

**D. Start → end frame**
```
[# Sources <FIRST_FRAME>@Image1 <LAST_FRAME>@Image2]
Smooth transition from <keadaan awal> to <keadaan akhir>, <gerak kamera>.
Use Image1 as the starting frame.
```

**E. Extension**
```
The scene continues: <apa yang terjadi berikutnya>. Keep the same character.
```

## 13. Checklist sebelum generate

- [ ] Bahasa Inggris, ±30–80 kata, 1–2 aksi
- [ ] `One continuous shot` bila perlu satu take
- [ ] Referensi dideklarasikan dengan tag; penampilan tidak dideskripsikan ulang
- [ ] Baris pengunci identitas + deskripsi suara disalin persis
- [ ] Dialog muat di durasi klip (dan dalam kutip bila pakai autopilot)
- [ ] `Sound design:` ditulis
- [ ] Larangan ditulis eksplisit (`No text overlay`, `No scene cuts`)
- [ ] Edit: satu perubahan + `Keep everything else the same.`

---

## Sumber

**Resmi**
- [DeepMind — Gemini Omni prompt guide](https://deepmind.google/models/gemini-omni/prompt-guide/)
- [Gemini API — Omni docs](https://ai.google.dev/gemini-api/docs/omni)
- [Google Flow — Creative prompting with Gemini Omni](https://x.com/FlowbyGoogle/article/2105398907702595802)
- [Google Flow — rilis Omni 1.1 & end frames](https://x.com/FlowbyGoogle/status/2093011783649001870)
- [Google Flow — workflow transisi](https://x.com/FlowbyGoogle/status/2110787663192064316)
- [Google Flow — konsistensi karakter](https://x.com/FlowbyGoogle/status/2085823649253327149)
- [Philipp Schmid — role-binding tags](https://x.com/_philschmid/status/2093012878211072183)

**Komunitas**
- [free-gemini-omni/awesome-gemini-omni-prompts](https://github.com/free-gemini-omni/awesome-gemini-omni-prompts)
- [Anil-matcha/Awesome-Gemini-Omni-API-Prompts](https://github.com/Anil-matcha/Awesome-Gemini-Omni-API-Prompts)
- [agbelemi/google-flow-scripting-skill](https://github.com/agbelemi/google-flow-scripting-skill)
- [Promptslove — Omni 1.1 Flash review](https://promptslove.com/blog/gemini-omni-1-1-flash-review/)
- [Roo — Google Omni prompting guide](https://roo.beehiiv.com/p/google-omni-prompting-guide-every-technique-that-actually-works)
- [LobeHub — character-consistency-character-sheet](https://lobehub.com/skills/michailbul-laniameda-skills-character-consistency-character-sheet)
- [pIXELsHAM — character sheet untuk AI video](https://www.pixelsham.com/2026/04/18/creating-a-character-sheet-for-ai-videos-using-nano-banana/)
- [nanobananafree — 15 template konsistensi](https://nanobananafree.net/blog/nano-banana-character-consistency-prompts)
