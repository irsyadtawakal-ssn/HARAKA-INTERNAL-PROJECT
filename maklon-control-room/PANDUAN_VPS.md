# Panduan Lengkap Deploy Maklon Control Room ke VPS

Panduan ini menjelaskan cara memasang dan menjalankan sistem **Maklon Control Room (Haraka Erfi)** di VPS (Virtual Private Server) seperti Ubuntu / Debian (DigitalOcean, AWS EC2, Linode, IDCloudHost, Niagahoster, dll).

---

## 🏗️ 1. Arsitektur di VPS

Secara bawaan, aplikasi ini dirancang untuk Firebase. Saat di-deploy ke **VPS**, kita mendapatkan keuntungan:
- **Hemat biaya:** Tidak memerlukan paket berbayar **Firebase Blaze** (Cloud Functions & Cloud Scheduler digantikan oleh backend Node.js mandiri + `node-cron` di VPS). Firebase tetap digunakan untuk **Auth** dan **Firestore** pada paket gratis (**Spark**).
- **Domain sendiri:** Menggunakan domain/subdomain kantor sendiri (misal: `maklon.perusahaan.com`) dengan SSL gratis Let's Encrypt.
- **Kontrol Penuh:** Layanan AI, cron job WhatsApp harian, dan web statis berjalan 24/7 di bawah kendali Anda.

```
                      [ Pengguna / Browser ]
                                |
                   HTTPS (Domain Kantor + SSL)
                                |
                          [ VPS Nginx ]
                        (Reverse Proxy)
                                |
                   +------------+------------+
                   |                         |
         [ Static Web Frontend ]     [ Express API & Cron ]
            (HTML/CSS/JS SPA)            (Port 3000)
                   |                         |
                   v                         v
          [ Firebase Auth & ]       [ Anthropic API (Claude) ]
          [ Cloud Firestore ]       [ Fonnte (WA Gateway)   ]
```

---

## 📋 2. Persiapan Sebelum Deploy

### A. Firebase (Tetap Gratis di Paket Spark)
1. Buka [Firebase Console](https://console.firebase.google.com/) dan buat project baru.
2. **Authentication → Sign-in method**: Aktifkan **Email/Password** (dan **Google** jika diinginkan).
3. **Firestore Database**: Buat database dalam mode production (pilih region terdekat: `asia-southeast2` Jakarta).
4. **Deploy Aturan Firestore**:
   - Salin isi file `firestore.rules` ke menu **Firestore Database → Rules** di Firebase Console, lalu klik **Publish**. Pastikan email di fungsi `isOwner()` diubah sesuai email admin/pemilik.
5. **Dapatkan Konfigurasi Web App**:
   - Buka **Project settings** (ikon gerigi) → Tab **General** → Bagian **Your apps** → Klik icon Web (`</>`).
   - Salin objek `firebaseConfig` ke dalam file `web/config.js`.
6. **Unduh Service Account Key (Kunci Server)**:
   - Buka **Project settings** → Tab **Service accounts** → Klik **Generate new private key**.
   - Simpan file JSON tersebut dengan nama `service-account.json`.

### B. Siapkan Domain & DNS VPS
1. Catat IP Publik VPS Anda (misal `103.xxx.xxx.xxx`).
2. Masuk ke DNS Management domain Anda (Cloudflare, cPanel, atau registrar domain).
3. Tambahkan **A Record**:
   - **Name / Host:** `maklon` (atau `@` jika domain utama)
   - **Target / IP:** `IP_PUBLIK_VPS_ANDA`
   - **TTL:** Auto / 300

---

## 🚀 3. Metode Deployment ke VPS

Ada dua cara mudah yang disediakan:
- **Metode A (Rekomendasi): Docker & Docker Compose** (Cepat, bersih, terisolasi).
- **Metode B: Native PM2 + Nginx** (Tanpa Docker).

---

### METODE A: Menggunakan Docker & Docker Compose (Paling Mudah)

#### 1. Masuk ke VPS via SSH
```bash
ssh root@IP_VPS_ANDA
```

#### 2. Install Docker & Docker Compose (Jika belum terpasang)
```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install -y docker-compose-plugin
```

#### 3. Upload / Clone Proyek ke VPS
```bash
cd /var/www
# Clone git atau upload via SCP / FileZilla
git clone <URL_REPO_ANDA> maklon-control-room
cd maklon-control-room
```

#### 4. Siapkan Konfigurasi
1. Salin template `.env`:
   ```bash
   cp server/.env.example server/.env
   nano server/.env
   ```
   Isi konfigurasi berikut:
   - `ANTHROPIC_API_KEY`: API key Claude dari [console.anthropic.com](https://console.anthropic.com)
   - `OWNER_EMAILS`: Email pemilik (sesuai `web/config.js`)
   - `FONNTE_TOKEN`: (Opsional) Token gateway Fonnte jika ingin WA otomatis aktif
   - `WA_AUTO_SEND=true`: Jika ingin follow-up otomatis aktif tiap jam 09.00 WIB

2. Taruh file `service-account.json` yang diunduh dari Firebase ke dalam folder `server/`:
   ```bash
   nano server/service-account.json
   # Tempel isi file JSON service account di sini, simpan (Ctrl+O, Enter, Ctrl+X)
   ```

3. Pastikan `web/config.js` sudah diisi konfigurasi Firebase Web App Anda:
   ```javascript
   aiEndpoint: "/api/ai", // Sudah benar untuk VPS
   ```

#### 5. Jalankan Container
```bash
docker compose up -d --build
```

Periksa apakah container sudah berjalan normal:
```bash
docker compose ps
docker compose logs -f
```

Aplikasi kini aktif di port `3000`.

---

### METODE B: Menggunakan PM2 + Nginx (Native Node.js)

Jika Anda tidak ingin menggunakan Docker:

#### 1. Install Node.js 20 & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

#### 2. Install Dependensi Server & Jalankan
```bash
cd /var/www/maklon-control-room
cp server/.env.example server/.env
nano server/.env # Isi ANTHROPIC_API_KEY, dll.

# Letakkan service-account.json di folder server/
nano server/service-account.json

# Install dependensi
cd server
npm install --omit=dev

# Jalankan service dengan PM2
pm2 start index.js --name "maklon-control-room"
pm2 save
pm2 startup
```

Periksa status:
```bash
pm2 status
pm2 logs maklon-control-room
```

---

## 🔒 4. Setup Domain & SSL Gratis (Nginx + Certbot)

Agar aplikasi dapat diakses lewat domain `https://maklon.domain.com` secara aman:

### 1. Install Nginx & Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Pasang Konfigurasi Nginx
```bash
# Salin konfigurasi yang sudah disediakan
sudo cp /var/www/maklon-control-room/nginx/maklon.conf /etc/nginx/sites-available/maklon.conf

# Edit domain Anda
sudo nano /etc/nginx/sites-available/maklon.conf
# Ganti "server_name maklon.yourdomain.com;" dengan domain Anda

# Aktifkan konfigurasi
sudo ln -s /etc/nginx/sites-available/maklon.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Pasang Sertifikat SSL Gratis (HTTPS)
```bash
sudo certbot --nginx -d maklon.yourdomain.com
```
Pilih opsi redirect HTTP ke HTTPS otomatis. Certbot akan memperbarui sertifikat secara otomatis setiap 3 bulan.

---

## 📊 5. Impor Data Awal (Opsional)

Jika Anda memiliki data awal pelanggan dan riwayat invoice tahun 2026:
```bash
cd /var/www/maklon-control-room/scripts
npm init -y && npm i firebase-admin
cp ../server/service-account.json ./service-account.json
node import-data.js
rm service-account.json
```

---

## 🔍 6. Uji Coba & Verifikasi

1. **Buka Aplikasi di Browser**: Kunjungi `https://maklon.yourdomain.com`. Halaman login Maklon Control Room akan muncul.
2. **Cek Health Check**: Kunjungi `https://maklon.yourdomain.com/api/health`. Pastikan hasilnya:
   ```json
   {
     "status": "ok",
     "aiConfigured": true,
     "waAutoSend": false
   }
   ```
3. **Login Pemilik**: Masuk dengan akun email pemilik yang terdaftar di `OWNER_EMAILS`.
4. **Tes Fitur AI**: Buka menu **Proyek / Sampel**, buat sampel baru, lalu coba fitur penyusunan brief AI atau draf pesan WA. AI akan membalas secara instan.
5. **Cek Cron Job WhatsApp**: Server VPS akan mengeksekusi pengecekan follow-up setiap hari pukul 09:00 WIB secara otomatis.

---

## 🛠️ 7. Perawatan & Pemantauan (Maintenance)

- **Melihat Log Aplikasi (Docker):**
  ```bash
  docker compose logs -f --tail=100
  ```
- **Melihat Log Aplikasi (PM2):**
  ```bash
  pm2 logs maklon-control-room
  ```
- **Restart Aplikasi setelah edit konfigurasi:**
  ```bash
  # Jika Docker:
  docker compose restart
  # Jika PM2:
  pm2 restart maklon-control-room
  ```
- **Update Versi Baru:**
  ```bash
  git pull
  docker compose up -d --build
  ```
