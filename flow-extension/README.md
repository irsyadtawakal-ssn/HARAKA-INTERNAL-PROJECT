# Haraka Flow Render Bridge

Extension Chrome (MV3) yang mengambil job render dari backend Haraka Factory dan menjalankannya di Google Flow:
Video → Frames → 9:16 → 720p → durasi → x2, foto referensi di slot Start, prompt, lalu Generate. Klip 720p yang
dihasilkan kembali ke backend sebagai aset turunan foto referensi.

Desain: `docs/superpowers/specs/2026-11-03-tab-pembuatan-konten-design.md` §4.2–4.3.

```
backend /flow/claim ──► background.js ──INJECT_PROMPT──► content.js (tab Flow)
        ▲  X-Device-Token        ▲  API (status, upload)        │
        │                        └──────────────────────────────┘
        └── worker beat: pindai FLOW_DOWNLOAD_DIR ◄── Chrome mengunduh 720p
```

- Satu job = satu klip. Extension mengerjakan satu job sekaligus.
- Lease 15 menit sejak laporan status terakhir. Sesudah 15 menit tanpa kabar, job kembali ke antrian (maks. 3 percobaan).
- Kuota harian dari `guardrail_settings.flow_daily_clip_limit` (default 30 klip, hari dihitung menurut WIB).
- **Captcha tidak diakali.** Bila Flow menampilkan captcha, job dilaporkan `failed: captcha` dan manusia menyelesaikannya lewat VNC.

## Larangan

- Jangan memakai solver captcha atau layanan sejenisnya.
- Jangan memakai flag `--load-extension`. Google Chrome resmi tidak mendukungnya; pasang lewat *Load unpacked*.
- Jangan login dengan akun Google utama bisnis. Pakai akun khusus render.
- Jangan mengedit file extension langsung di VPS. Sumbernya ada di repo ini; update lewat `git pull`.

## Pemasangan di VPS Factory

Dijalankan di VPS Factory 8 GB (terpisah dari VPS WA), di mesin yang sama dengan worker backend.

### 1. Desktop virtual + VNC

```bash
sudo apt install -y xvfb xfce4 x11vnc
```

- Jalankan Xvfb di display `:1` (misalnya `Xvfb :1 -screen 0 1440x900x24`) dan desktop ringan di atasnya.
- `x11vnc` **hanya** listen di `127.0.0.1`. Akses dari laptop lewat SSH tunnel:

```bash
ssh -L 5901:127.0.0.1:5901 user@vps-factory
```

### 2. Google Chrome dengan profil khusus

- Pasang Google Chrome stable (bukan Chromium), non-headless.
- Profil: `/srv/flow-chrome-profile`. Login sekali lewat VNC dengan akun Google render, termasuk 2FA.
- Setelan Chrome → Downloads: lokasi `/srv/flow-downloads`, matikan "Ask where to save each file".

### 3. Unit systemd (batas memori + restart harian)

`/etc/systemd/system/flow-chrome.service`:

```ini
[Unit]
Description=Chrome untuk render Google Flow
After=network-online.target

[Service]
User=flow
Environment=DISPLAY=:1
ExecStart=/usr/bin/google-chrome --user-data-dir=/srv/flow-chrome-profile --no-first-run https://labs.google/fx/tools/flow
Restart=always
RestartSec=10
MemoryMax=3G

[Install]
WantedBy=multi-user.target
```

Restart harian pukul 04:00 WIB (`/etc/systemd/system/flow-chrome-restart.timer` + service `systemctl restart flow-chrome`):

```ini
[Timer]
OnCalendar=*-*-* 04:00:00 Asia/Jakarta
Persistent=true

[Install]
WantedBy=timers.target
```

### 4. Backend

Di `backend/.env` VPS:

- `FLOW_DOWNLOAD_DIR=/srv/flow-downloads`. Folder ini di-mount ke container worker lewat `docker-compose.yml`.
- **Izin folder.** Chrome berjalan sebagai user `flow`, sedangkan worker di container berjalan sebagai user `app` (UID berbeda). Worker harus bisa me-rename file serta membuat `processed/` dan `orphans/` di folder itu. Kalau izin ini tidak ada, ingest gagal `PermissionError` tiap 5 detik. Cek UID worker dengan `docker compose run --rm worker id -u`, lalu:

```bash
sudo setfacl -m u:<uid-worker>:rwx /srv/flow-downloads
sudo setfacl -d -m u:<uid-worker>:rwx -m u:flow:rwx /srv/flow-downloads
```

- **Satu device aktif per folder unduhan.** Ingest memasangkan file lewat nama file yang dilaporkan extension. Kalau nama itu tidak ada, ingest memakai job yang sedang diunduh. Bila memindahkan render ke mesin lain, nonaktifkan device lama (`PATCH /render-devices/{id}` `{"is_active": false}`).
- `CORS_ORIGINS` memuat `"https://flow.google.com"` dan `"https://labs.google"`. Ini dibutuhkan untuk mengambil foto referensi dan untuk upload cadangan ke storage. Aturan CORS bucket ikut nilai ini saat API start.
- Jalankan juga service `beat` (`docker compose --profile app up -d`). Beat menjadwalkan ingest unduhan tiap 5 detik.

Daftarkan device (owner), lalu simpan token yang muncul. Token **hanya tampil sekali**:

```bash
curl -X POST https://<backend>/render-devices -H "Authorization: Bearer <token owner>" -H "Content-Type: application/json" -d '{"name":"VPS Flow 1"}'
```

### 5. Pasang extension

1. Di VPS: `git pull` repo ini, misalnya ke `/opt/haraka`.
2. Lewat VNC: `chrome://extensions` → aktifkan *Developer mode* → **Load unpacked** → pilih `/opt/haraka/flow-extension`.
3. Klik ikon extension. Isi alamat backend (`https://...`) dan token device, lalu klik **Simpan & uji**. Izinkan akses ke alamat backend. Popup harus menampilkan `Terhubung sebagai device "VPS Flow 1"`.
4. Biarkan satu tab Google Flow terbuka. Extension mengambil job sendiri.

Update: `git pull` di VPS → `chrome://extensions` → **Reload** pada extension ini → **muat ulang tab Google Flow**. Tab lama masih memakai content script versi sebelumnya yang sudah terputus. Bila job dikirim ke tab itu, job langsung dikembalikan ke antrian dengan pesan "Tab Flow tidak merespons".

**Captcha:** begitu captcha terdeteksi, job dilaporkan gagal dan klaim dijeda 30 menit. Selesaikan captcha lewat VNC, lalu klik **Simpan & uji** di popup untuk langsung melanjutkan.

## Uji coba seminggu

Laporan harian (klaim, selesai, gagal permanen, alasan gagal termasuk `captcha` dan `lease habis`, median menit klaim → selesai):

```bash
cd backend && uv run python -m scripts.render_trial_report --since 2026-11-03
```

Jika captcha atau lease habis sering muncul, pindahkan mesin render ke mini PC kantor. Caranya: login Chrome di mesin baru dan isi token device baru. Kalau backend tidak berada di mesin yang sama, hasil render memakai jalur upload cadangan.

### Verifikasi manual pertama di VPS

- [ ] Popup **Simpan & uji** berhasil, dan `chrome://extensions` tidak menampilkan error.
- [ ] Lima job berurutan (3 `hook`, 1 `cta`, 1 `broll`) semuanya berstatus `done` di `GET /render-jobs`.
- [ ] Hasilnya muncul di `/aset` sebagai turunan foto referensi.
- [ ] Chrome dimatikan di tengah job (`systemctl stop flow-chrome`). Dalam ≤ 16 menit job kembali `queued`, lalu selesai setelah Chrome dinyalakan lagi.

## Pengembangan

```bash
node --test flow-extension/lib.test.mjs
```

`lib.js` berisi fungsi murni yang dipakai content script dan service worker. DOM Google Flow tidak diuji otomatis.
Perubahan selector diuji manual di tab Flow.
