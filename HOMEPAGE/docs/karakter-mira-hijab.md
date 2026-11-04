# Karakter: Mira (avatar AI berhijab, pendamping Rara)

Konsepnya sama dengan Rara:
- **Peran:** AI beauty consultant yang elegan untuk produsen kosmetik premium.
- **Kulit:** porselen dengan finish glass skin.
- **Detail cyborg:** sangat halus, berupa garis cahaya rose-gold dan aksesori keramik putih mutiara.
- **Busana:** atasan satin ivory.
- **Latar dan cahaya:** latar `#efe6e5`, cahaya beauty yang rata.
- **Framing:** kepala sampai bahu, menghadap lurus ke kamera.

Hasilnya dipakai untuk klip avatar website, sesuai [avatar-clip-spec.md](avatar-clip-spec.md).

Bedanya hanya dua:
- **Rambut platinum diganti hijab** dengan warna sepalet: putih mutiara dan champagne.
- **Wajahnya orang lain**, supaya Mira dan Rara tidak terlihat kembar.

| Bagian | Rara | Mira |
|---|---|---|
| Wajah | oval, tulang pipi tegas halus, mata hazel muda, alis taupe muda | lebih bulat lembut, pipi sedikit penuh, mata cokelat madu, alis cokelat lembut, tahi lalat kecil di bawah mata kanan |
| Kepala | rambut platinum, belah tengah | hijab satin putih mutiara dengan kilau champagne, rambut tidak terlihat |
| Cyborg | garis rose-gold dari depan telinga kiri ke rahang + ear cuff keramik | garis rose-gold dari tepi hijab kiri ke rahang + peniti hijab keramik bercahaya di kiri |
| Kulit, baju, cahaya, latar, kamera | — | sama |

---

## Prompt utama (ChatGPT) · potret master 4:5

```
Ultra-realistic beauty portrait photograph of a young woman in her mid-20s named Mira, an elegant hijab-wearing AI beauty consultant for a premium cosmetics manufacturer. Soft pan-Asian features with a gentle Indonesian warmth: soft rounded oval face, slightly full youthful cheeks, small refined nose, full natural lips in a muted rose-nude tint, calm almond-shaped eyes with warm honey-brown irises, natural lashes, softly groomed soft-brown eyebrows, a tiny beauty mark just below the RIGHT eye.

Skin: flawless porcelain skin, luminous "glass skin" finish with a subtle dewy glow on the cheekbones, nose bridge and cupid's bow, faint natural skin texture and very fine pores still visible (not plastic, not airbrushed). Barely-there blush on the cheeks.

Hijab: sleek pearl-white satin hijab with a soft champagne sheen, folded into a smooth, neat rounded frame around the face and draped gracefully over the shoulders, fully covering all hair, ears and neck. No hair visible at all. The hijab edge frames the face but does NOT cover the eyes, cheeks, lips or jawline. Tidy and calm.

Cyborg detail (very subtle): one ultra-thin luminous line of warm rose-gold light running from just under the hijab edge on the left side of the face down along the jawline, like a delicate seam in porcelain, plus a tiny pearl-white ceramic hijab pin with a soft glowing dot on the LEFT side under the chin. Everything else looks fully human.

Wardrobe: minimalist high-neck top in soft ivory satin under the hijab drape, clean and luxurious, no logos.

Pose and framing: head-and-shoulders portrait, body and face facing straight to camera, head level and centered, eyes looking directly into the lens with a warm, kind, attentive expression, mouth gently closed with the faintest friendly smile. Eyes positioned about 38% from the top of the frame. Shoulders fully visible, symmetrical.

Lighting: soft, even beauty lighting, large diffused key light from the front slightly above, gentle fill, no harsh shadows, soft catchlights in both eyes. Warm neutral color grade.

Background: completely plain, seamless, flat warm blush-beige backdrop (hex #efe6e5), no gradient, no objects, no text.

Camera: 85mm portrait lens, f/4, sharp focus on the eyes, high-end editorial beauty campaign quality, photorealistic, 4:5 vertical aspect ratio.

Avoid: text, logos, watermark, jewelry clutter, heavy makeup, neon colors, visible robotic body parts, exaggerated anime proportions, tilted head, open mouth, teeth showing, hands in frame, any visible hair, hijab covering the face, loose or messy hijab, uncanny or doll-like look.
```

ChatGPT tidak punya ukuran 4:5. Hasil 2:3 di-crop ke 1080 × 1350 dengan mata sekitar 38% dari atas.

## Perbaikan cepat (balas di chat yang sama)

- Rambut kelihatan: `Edit only the hijab so it fully covers all hair, ears and neck. Keep everything else the same.`
- Terlalu mirip Rara: `Make her face clearly a different person from Rara: rounder softer face, fuller cheeks, honey-brown eyes, tiny beauty mark below the right eye. Keep the hijab, outfit, lighting and background the same.`
- Terlalu mulus seperti boneka: `Make the skin look like a real camera photo with faint natural texture and fine pores, keep the glass-skin glow. Keep everything else the same.`
- Cyborg terlalu mencolok: `Make the rose-gold line on the jaw thinner and fainter, barely visible. Keep everything else the same.`

## Dari potret master ke klip avatar

Potret master yang sudah jadi dipakai sebagai **satu gambar awal untuk semua klip** (`idle`, `listening`, `thinking`, `speaking`). Aturan durasi, loop, dan nama file sama dengan Rara di [avatar-clip-spec.md](avatar-clip-spec.md). Simpan hasil mentahnya di `avatar-raw/` dengan awalan `mira-` supaya tidak tercampur dengan klip Rara.

Suara Mira (kalau diperlukan untuk TTS): `warm, gentle, clear female voice, medium pitch, polite Indonesian with light Jakarta casualness, calm unhurried tempo, smiles while talking`.

---

## Prompt klip state (image-to-video)

Cara pakai (Google Flow, mode **Video → Frames**):
- **Start** dan **End** diisi potret master Mira yang sama, supaya frame pertama = frame terakhir dan klip bisa di-loop mulus.
- Kalau tool hanya punya slot Start, isi Start saja. Prompt tetap meminta kepala kembali ke pose awal di akhir.
- Rasio potret, **tanpa audio**. Hasil di-crop/export ke 1080 × 1350 (4:5), MP4, di bawah 3 MB.
- Setiap prompt diawali blok **kunci** yang sama supaya wajah, hijab, cahaya, dan latar tidak bergeser antar klip.

Blok kunci (sudah termasuk di setiap prompt di bawah):
```
Use the image as the starting frame. Locked-off static camera, no zoom, no pan, no cut.
Keep her face, porcelain skin, pearl-white hijab fully covering hair, rose-gold jaw line,
ceramic pin, ivory satin top and lighting exactly as in the image.
The background is locked: the exact same plain flat background from the image, same color
and brightness in every frame, never changes, no new objects, no room, no gradient, no blur change.
Head stays centered, same size and position. Silent, no audio, no music, no text.
```

**1. `mira-idle-1.mp4` · 6 detik · loop**
```
Use the image as the starting frame. Locked-off static camera, no zoom, no pan, no cut.
Keep her face, porcelain skin, pearl-white hijab fully covering hair, rose-gold jaw line,
ceramic pin, ivory satin top and lighting exactly as in the image.
The background is locked: the exact same plain flat background from the image, same color
and brightness in every frame, never changes, no new objects, no room, no gradient, no blur change.
Head stays centered, same size and position. Silent, no audio, no music, no text.
She rests calmly, looking into the lens.
She keeps a soft, visible closed-mouth smile the whole time: corners of the lips gently lifted, warm smiling eyes, never a neutral or serious face.
Slow natural breathing makes her shoulders and the hijab drape rise and fall very slightly.
She blinks naturally once around 2s and once around 4.5s.
The rose-gold line on her jaw and the ceramic pin stay exactly as in the image, no glowing,
no pulsing, no light effects.
By the end she is back in exactly the starting pose, looking straight into the lens.
```

**2. `mira-idle-2.mp4` · 6 detik · loop**
```
Use the image as the starting frame. Locked-off static camera, no zoom, no pan, no cut.
Keep her face, porcelain skin, pearl-white hijab fully covering hair, rose-gold jaw line,
ceramic pin, ivory satin top and lighting exactly as in the image.
The background is locked: the exact same plain flat background from the image, same color
and brightness in every frame, never changes, no new objects, no room, no gradient, no blur change.
Head stays centered, same size and position. Silent, no audio, no music, no text.
She breathes slowly and calmly.
She keeps a soft, visible closed-mouth smile the whole time: corners of the lips gently lifted, warm smiling eyes, never a neutral or serious face.
Around 2s her eyes glance softly to her left for a moment, then return to the lens;
her head does not turn, only the eyes move. She blinks once around 4s.
By the end she is back in exactly the starting pose, looking straight into the lens.
```

**3. `mira-listening-1.mp4` · 6 detik · loop**
```
Use the image as the starting frame. Locked-off static camera, no zoom, no pan, no cut.
Keep her face, porcelain skin, pearl-white hijab fully covering hair, rose-gold jaw line,
ceramic pin, ivory satin top and lighting exactly as in the image.
The background is locked: the exact same plain flat background from the image, same color
and brightness in every frame, never changes, no new objects, no room, no gradient, no blur change.
Head stays centered, same size and position. Silent, no audio, no music, no text.
She listens attentively to someone in front of the camera, eyes on the lens, warm and
interested.
She keeps a soft, visible closed-mouth smile the whole time: corners of the lips gently lifted, warm smiling eyes, never a neutral or serious face.
Her eyebrows lift very slightly, and she gives two small slow nods, around 1.5s
and 3.5s, as if saying "I understand". She blinks once naturally.
By the end she is back in exactly the starting pose, looking straight into the lens.
```

**4. `mira-thinking-1.mp4` · 5 detik · loop**
```
Use the image as the starting frame. Locked-off static camera, no zoom, no pan, no cut.
Keep her face, porcelain skin, pearl-white hijab fully covering hair, rose-gold jaw line,
ceramic pin, ivory satin top and lighting exactly as in the image.
The background is locked: the exact same plain flat background from the image, same color
and brightness in every frame, never changes, no new objects, no room, no gradient, no blur change.
Head stays centered, same size and position. Silent, no audio, no music, no text.
She thinks for a moment: her eyes drift up and slightly to her right, her head tilts
only a tiny bit.
She keeps a soft, visible closed-mouth smile the whole time: corners of the lips gently lifted, warm smiling eyes, never a neutral or serious face.
The rose-gold line on her jaw and the ceramic pin stay exactly as in the image, no glowing,
no pulsing, no light effects.
From 3.5s her eyes come back to the lens and she ends in exactly the starting pose.
Do not change the background at all.
```

**5. `mira-speaking-1.mp4` · 4 detik · tidak di-loop**
```
Use the image as the starting frame. Locked-off static camera, no zoom, no pan, no cut.
Keep her face, porcelain skin, pearl-white hijab fully covering hair, rose-gold jaw line,
ceramic pin, ivory satin top and lighting exactly as in the image.
The background is locked: the exact same plain flat background from the image, same color
and brightness in every frame, never changes, no new objects, no room, no gradient, no blur change.
Head stays centered, same size and position. Silent, no audio, no music, no text.
She speaks softly and calmly to the camera, as if explaining something kindly.
Her lips move gently with small, subtle mouth movements, no wide articulation, teeth
barely visible. Very small natural head movements and a light friendly expression.
She starts and ends with her mouth closed, looking straight into the lens.
She smiles while talking: corners of the lips stay gently lifted, warm smiling eyes, never a neutral or serious face.
The rose-gold line on her jaw and the ceramic pin stay exactly as in the image, no glowing,
no pulsing, no light effects.
Do not change the background at all.
```

**6. `mira-speaking-2.mp4` · 4 detik · tidak di-loop**
```
Use the image as the starting frame. Locked-off static camera, no zoom, no pan, no cut.
Keep her face, porcelain skin, pearl-white hijab fully covering hair, rose-gold jaw line,
ceramic pin, ivory satin top and lighting exactly as in the image.
The background is locked: the exact same plain flat background from the image, same color
and brightness in every frame, never changes, no new objects, no room, no gradient, no blur change.
Head stays centered, same size and position. Silent, no audio, no music, no text.
She talks softly to the camera with a warm smile, as if answering a question.
Subtle lip movements, no wide articulation. Midway she gives one small nod for emphasis
and her eyebrows lift slightly. She starts and ends with her mouth closed, looking
straight into the lens.
She smiles while talking: corners of the lips stay gently lifted, warm smiling eyes, never a neutral or serious face.
The rose-gold line on her jaw and the ceramic pin stay exactly as in the image, no glowing,
no pulsing, no light effects.
Do not change the background at all.
```

**7. `mira-speaking-3.mp4` · 4 detik · tidak di-loop**
```
Use the image as the starting frame. Locked-off static camera, no zoom, no pan, no cut.
Keep her face, porcelain skin, pearl-white hijab fully covering hair, rose-gold jaw line,
ceramic pin, ivory satin top and lighting exactly as in the image.
The background is locked: the exact same plain flat background from the image, same color
and brightness in every frame, never changes, no new objects, no room, no gradient, no blur change.
Head stays centered, same size and position. Silent, no audio, no music, no text.
She speaks gently and reassuringly to the camera, calm tempo.
Subtle lip movements, a soft blink in the middle, a very slight head tilt to her left
that returns to center. She starts and ends with her mouth closed, looking straight
into the lens.
She smiles while talking: corners of the lips stay gently lifted, warm smiling eyes, never a neutral or serious face.
The rose-gold line on her jaw and the ceramic pin stay exactly as in the image, no glowing,
no pulsing, no light effects.
Do not change the background at all.
```

### Cek sebelum dipasang

- Taruh frame pertama dan terakhir tiap klip loop berdampingan. Posisi kepala dan hijab harus sama.
- Hijab tidak bergeser dan rambut tidak muncul di sepanjang klip.
- Latar sama persis dengan potret master di semua frame: tidak berganti, tidak berkedip, tidak menggelap. Kalau masih berubah, tambahkan di akhir prompt: `Do not change the background at all.`
- Bibir di klip speaking bergerak kecil, bukan mangap lebar.
- Klip yang gagal cukup di-generate ulang dengan prompt yang sama. Kalau sering geser, tambahkan `Her head and body stay almost completely still.`

---

## Klip sapaan (`greeting`) · video Flow + Voice Changer ElevenLabs

Klip ini diputar sekali saat pengunjung pertama kali mengetuk halaman. Bibir harus sinkron dengan kalimatnya. Suara bawaan Flow nanti diganti voice masing-masing karakter lewat **ElevenLabs Voice Changer (Speech-to-Speech)**. Voice Changer mempertahankan tempo, jadi bibir tetap pas.

Kalimat sapaan (sama dengan isi **Kalimat Sapaan Awal** di dashboard):
- Mira: *"Halo Kak, selamat datang! Aku Mira dari Haraka Erfi. Mau bikin brand skincare sendiri? Yuk, ngobrol sama aku!"*
- Rara: *"Halo Kak, selamat datang! Aku Rara dari Haraka Erfi. Mau bikin brand skincare sendiri? Yuk, ngobrol sama aku!"*

Cara pakai:
- Pakai Google Flow mode **Video → Frames**, dengan durasi **8 detik**.
- Slot **Start** dan **End** diisi potret master yang sama (versi tersenyum). Ini yang membuat klip menyambung mulus ke `idle`.
- **Audio jangan dimatikan.** Suara Flow dipakai sebagai bahan Voice Changer.
- Simpan hasilnya di `avatar-raw/` dengan nama `mira greeting.mp4` atau `rara greeting.mp4`.

**`mira-greeting.mp4` · 8 detik**
```
Use the image as the starting frame. Locked-off static camera, no zoom, no pan, no cut.
Keep her face, porcelain skin, pearl-white hijab fully covering hair, rose-gold jaw line,
ceramic pin, ivory satin top and lighting exactly as in the image.
The background is locked: the exact same plain flat background from the image, same color
and brightness in every frame, never changes, no new objects, no room, no gradient, no blur change.
Head stays centered, same size and position.
She warmly welcomes a visitor who just arrived, looking straight into the lens with a bright,
friendly smile. At the start she gives a small welcoming nod, then says in a warm, gentle, clear
young female voice, casual Jakarta Indonesian, calm cheerful tempo, smiling while talking:
"Halo Kak, selamat datang! Aku Mira dari Haraka Erfi (pronounced "ha-RA-ka ER-fi"). Mau bikin brand skincare sendiri? Yuk, ngobrol sama aku!"
Natural lip movements clearly matching every word, small natural head movements, eyebrows lift
slightly on "selamat datang" and on the question.
After the last word she closes her mouth into a soft smile and returns to exactly the starting
pose, looking straight into the lens.
The rose-gold line on her jaw and the ceramic pin stay exactly as in the image, no glowing,
no pulsing, no light effects.
Sound: only her voice, clean studio sound, no music, no background noise. No text on screen.
Do not change the background at all.
```

**`rara-greeting.mp4` · 8 detik** (potret master Rara di Start dan End)
```
Use the image as the starting frame. Locked-off static camera, no zoom, no pan, no cut.
Keep her face, porcelain skin, sleek platinum-white hair with middle part, ivory satin high-neck
top, subtle rose-gold jaw line, ceramic ear cuff and lighting exactly as in the image.
The background is locked: the exact same plain flat background from the image, same color
and brightness in every frame, never changes, no new objects, no room, no gradient, no blur change.
Head stays centered, same size and position. Hair stays calm, no strands crossing the face.
She warmly welcomes a visitor who just arrived, looking straight into the lens with a bright,
friendly smile. At the start she gives a small welcoming nod, then says in a warm, clear, elegant
young female voice, casual Jakarta Indonesian, calm cheerful tempo, smiling while talking:
"Halo Kak, selamat datang! Aku Rara dari Haraka Erfi (pronounced "ha-RA-ka ER-fi"). Mau bikin brand skincare sendiri? Yuk, ngobrol sama aku!"
Natural lip movements clearly matching every word, small natural head movements, eyebrows lift
slightly on "selamat datang" and on the question.
After the last word she closes her mouth into a soft smile and returns to exactly the starting
pose, looking straight into the lens.
The rose-gold line and the ear cuff stay exactly as in the image, no glowing, no pulsing,
no light effects.
Sound: only her voice, clean studio sound, no music, no background noise. No text on screen.
Do not change the background at all.
```

Langkah di ElevenLabs Voice Changer:
1. Upload video hasil Flow. Bisa langsung file mp4-nya, atau ekstrak audionya dulu.
2. Pilih voice karakter. Mira memakai voice `U3dExJoUNcmTY5H6GMuG`, dan Rara memakai voice Rara di dashboard.
3. Nyalakan **Remove background noise**. Biarkan stability dan similarity di nilai default dulu.
4. Download hasilnya (mp3) dan simpan di `avatar-raw/` dengan nama `mira greeting voice.mp3` atau `rara greeting voice.mp3`.

Setelah video dan audio ada, audio baru digabungkan ke video. Latar diganti seperti klip lain, lalu klip dipasang sebagai `greeting`. Selama klip `greeting` belum ada, website memakai TTS sebagai cadangan.

### Cek sebelum dipakai

- Kalimatnya diucapkan lengkap, termasuk "Haraka Erfi", tidak terpotong, dan tidak ada kata tambahan.
- Gerak bibir pas dengan audio hasil Voice Changer.
- Frame pertama dan terakhir sama dengan potret master, dan mulut tertutup di akhir.
- Latar tidak berubah, dan hijab atau rambut tidak bergeser.
