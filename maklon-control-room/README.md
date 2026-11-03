# Maklon Control Room — panduan pasang

Sistem CRM & produksi maklon untuk Haraka Erfi: login, data pelanggan, proyek & sampel, follow-up WA terjadwal (pesan ditulis AI), portal progres pabrik, invoice & piutang, analisa harian/mingguan/bulanan/tahunan, serta impor data tahun lama.

Stack: HTML + JavaScript murni (tanpa build), **Firebase** (Auth, Firestore, Hosting, Cloud Functions), **Anthropic API** untuk AI, **Fonnte** (opsional) untuk kirim WA otomatis.

```
maklon-control-room/
├── web/                  ← yang di-hosting
│   ├── index.html        ← aplikasi (semua tampilan & logika)
│   ├── auth-adapter.js   ← halaman login + jembatan ke Firebase
│   └── config.js         ← ISI DULU: config Firebase, email pemilik, URL AI
├── functions/            ← Cloud Functions: ai (AI) & waAutoSend (WA otomatis)
├── firestore.rules       ← aturan akses per peran
├── firebase.json
├── scripts/import-data.js← impor data 2026
└── data/                 ← data 2026 dari sistem (pelanggan, 333 invoice, kontak WA) + invoice_2026.csv
```

## 1. Siapkan Firebase
1. Buat project di https://console.firebase.google.com (paket **Blaze** diperlukan untuk Cloud Functions).
2. **Authentication → Sign-in method**: aktifkan *Email/Password* dan *Google*.
3. **Firestore Database**: buat database (mode production, lokasi `asia-southeast2` Jakarta).
4. **Project settings → Your apps → Web**: daftarkan web app, salin config ke `web/config.js`.
5. Di `web/config.js` dan `firestore.rules` (fungsi `isOwner`), isi **email pemilik**. Keduanya harus sama.

## 2. Deploy
```bash
npm i -g firebase-tools
firebase login
firebase use --add                      # pilih project
cd functions && npm i && cp .env.example .env && cd ..
firebase functions:secrets:set ANTHROPIC_API_KEY   # dari console.anthropic.com
firebase deploy --only firestore:rules,functions,hosting
```
Setelah deploy, salin URL function `ai` (muncul di terminal) ke `aiEndpoint` di `web/config.js`, lalu `firebase deploy --only hosting` lagi.

Domain sendiri: Hosting → Add custom domain.

## 3. Impor data 2026
```bash
cd scripts && npm init -y && npm i firebase-admin
# taruh service account key di scripts/service-account.json (Project settings → Service accounts)
node import-data.js
```
Hapus `service-account.json` setelah selesai. Data tahun-tahun sebelumnya bisa diimpor dari dalam aplikasi: menu **Data lama & impor** (tempel dari Excel / upload CSV).

## 4. Login & peran
- Semua orang masuk lewat halaman login (email+password atau Google). Akun bisa dibuat sendiri dari halaman login (`allowRegister`), atau dibuatkan di Firebase Console → Authentication → Add user.
- Akun baru tidak melihat data apa pun. Dia klik **Minta akses**, lalu pemilik membuka **Akses & pengaturan** dan memilih **Admin** atau **Pabrik**.
- **Admin**: semua menu (pelanggan, proyek, follow-up, invoice, analisa, data lama).
- **Pabrik**: hanya tugas sampel & produksi dan riwayat laporan. Tidak bisa membaca invoice/piutang (dikunci di `firestore.rules`).
- Pemilik bisa melihat tampilan pabrik lewat tombol Admin/Pabrik di sidebar.

## 5. Alur kerja
1. Kontak WA masuk → admin tambah **Pelanggan**.
2. Pelanggan minta sampel → **Proyek / sampel** baru (biaya sampel dicatat sebagai invoice). Request langsung masuk ke pabrik + brief dibuat AI.
3. Pabrik **Lapor progres** tiap tahap (sampel: antre → formulasi → jadi → dikirim + resi; produksi: bahan baku → mixing → filling → QC → packing → siap kirim → terkirim). Setiap laporan jadi draf pesan update untuk pelanggan.
4. Sampel ditandai **diterima** → jadwal follow-up H+1, H+3, H+7, H+14, H+30 dibuat otomatis. Berhenti sendiri saat DP, revisi, atau batal.
5. DP dicatat di **Invoice** (pilih proyeknya) → proyek otomatis berstatus deal.

## 6. WA otomatis (opsional)
Default: sistem menyiapkan pesan, admin klik "Buka WhatsApp" lalu "Tandai terkirim".
Untuk kirim otomatis tiap pagi pukul 09.00 WIB:
1. Daftar WA gateway (kode memakai **Fonnte**; cek format API di dokumentasi terbaru Fonnte sebelum dipakai).
2. `firebase functions:secrets:set FONNTE_TOKEN`
3. Di `functions/.env`: `WA_AUTO_SEND=true` (follow-up) dan/atau `WA_AUTO_PROGRESS=true` (update progres pabrik).
4. `firebase deploy --only functions`
Gateway non-resmi berisiko nomor diblokir WhatsApp; untuk volume besar pertimbangkan WhatsApp Business API resmi (ganti fungsi `sendWA`).

## 7. Struktur data Firestore
| Koleksi | Isi | Field penting |
|---|---|---|
| `customers` | pelanggan | nama, panggilan, wa, brand, kota, sumber, catatan, createdAt, imported |
| `projects` | satu produk per proyek | customerId, produk, kategori, qtyRencana, biayaSampel, sampelLunas, stage, tahapPabrik, progress, tglRequest, tglSampelKirim, resi, tglSampelDiterima, tglDeal, tglSelesai, brief |
| `updates` | timeline/laporan | projectId, at, by, role, stage, tahap, progress, catatan |
| `followups` | jadwal follow-up | projectId, customerId, due, step, tujuan, status (pending/sent/skipped/cancelled), pesan, hasil, sentAt |
| `outbox` | draf update progres ke pelanggan | projectId, customerId, tahap, progress, pesan, status (draft/sent/skipped) |
| `payments` | invoice | customerId, projectId, tanggal, noInvoice, jenis, produk, qty, nilai (incl. PPN), ppn, status (lunas/belum), jatuhTempo, tglLunas |
| `leads` | kontak WA per bulan (id `YYYY-MM`) | count |
| `roles` / `requests` / `users` | peran, permintaan akses, nama tampilan | role (admin/pabrik) |
| `meta/settings` | nama perusahaan di pesan | namaPerusahaan, namaAdmin |

Semua tanggal disimpan sebagai teks `YYYY-MM-DD` (waktu: ISO).

## Catatan teknis
- `auth-adapter.js` menyediakan `window.claude.use('db'|'user'|'sample')` agar `index.html` (awalnya dibuat di Claude) jalan tanpa perubahan logika. `db` adalah Firestore compat SDK.
- Status pelanggan baru/funnel/analisa dihitung di browser dari data yang dimuat. Jika invoice sudah puluhan ribu, pindahkan agregasi ke Cloud Function atau BigQuery.
- Kontak WA mode harian/mingguan dihitung dari pelanggan yang diinput; data bulanan lama (koleksi `leads`) hanya per bulan.
