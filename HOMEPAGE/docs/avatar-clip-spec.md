# Spesifikasi Klip Video Avatar Rara

Dokumen ini untuk pembuat klip wajah final. Website memutar klip-klip ini bergantian sesuai keadaan avatar, lalu menyambungnya dengan crossfade 250 ms. Kalau semua aturan di bawah dipenuhi, sambungannya tidak akan terlihat.

## Daftar klip

| Keadaan | Jumlah | Durasi | Loop? | Isi gerakan |
|---|---|---|---|---|
| `idle` (diam) | 2 | 4–8 detik | ya, mulus | bernapas, berkedip 1–2 kali, sesekali melirik |
| `listening` (mendengarkan) | 1 | 4–8 detik | ya, mulus | menatap kamera, sedikit mengangguk |
| `thinking` (berpikir) | 1 | 3–6 detik | ya, mulus | melirik ke samping atas, senyum tipis |
| `speaking` (berbicara) | 3 | 3–5 detik | tidak (diputar acak bergantian) | bibir bergerak **halus** seperti bicara pelan, kepala bergerak kecil |

Gerakan mulut harus halus, bukan artikulasi lebar. Klip ini tidak sinkron dengan kata-kata, jadi gerak bibir yang kecil terlihat lebih natural.

## Format teknis

- **Ukuran:** 1080 × 1350 piksel (rasio 4:5, potret).
- **Format:** MP4 (H.264), 24–30 fps, **tanpa audio**. Ukuran per file usahakan di bawah 3 MB.
- **Latar:** polos warna `#efe6e5`. Kalau tools-nya bisa, pakai WebM transparan.
- **Framing:** kepala sampai bahu, wajah di tengah, mata sekitar 38% dari atas frame.

## Aturan supaya sambungan tidak terlihat

1. **Posisi kepala, ukuran wajah, pencahayaan, dan warna sama persis** di semua klip. Paling mudah kalau semua klip dibuat dari **satu gambar awal yang sama**.
2. Untuk klip yang di-loop: **frame pertama sama dengan frame terakhir**. Kepala kembali ke posisi awal.
3. Semua klip dimulai dan diakhiri dengan pose netral: menatap depan, mulut tertutup atau hampir tertutup.

## Nama file dan cara memasang

Simpan klip di folder `public/avatar/`:

```
idle-1.mp4  idle-2.mp4  listening-1.mp4  thinking-1.mp4
speaking-1.mp4  speaking-2.mp4  speaking-3.mp4
```

Setelah itu ganti isi `public/avatar/manifest.json` menjadi:

```json
{
  "mode": "clips",
  "clips": {
    "idle": ["idle-1.mp4", "idle-2.mp4"],
    "listening": ["listening-1.mp4"],
    "thinking": ["thinking-1.mp4"],
    "speaking": ["speaking-1.mp4", "speaking-2.mp4", "speaking-3.mp4"]
  }
}
```

Kodenya tidak perlu diubah. Kalau manifest salah tulis, website otomatis kembali ke avatar placeholder.

Untuk melihat keempat keadaan bergantian, buka `/?debugAvatar=1`.
