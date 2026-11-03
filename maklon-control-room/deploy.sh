#!/bin/bash
# ============================================================
#  Skrip Deploy Otomatis — Maklon Control Room di VPS (Ubuntu/Debian)
# ============================================================

set -e

echo "=== Memulai Deploy Maklon Control Room ==="

# 1. Cek apakah Docker terpasang
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    echo "[1/3] Docker & Docker Compose terdeteksi. Memilih metode Docker..."
    
    if [ ! -f "server/.env" ]; then
        echo "Menyiapkan server/.env dari template..."
        cp server/.env.example server/.env
        echo "PERINGATAN: Silakan edit 'server/.env' untuk mengisi ANTHROPIC_API_KEY dan konfigurasi lainnya."
    fi

    if [ ! -f "server/service-account.json" ]; then
        echo "PERINGATAN: Pastikan Anda menaruh file 'service-account.json' di dalam folder server/ !"
    fi

    echo "[2/3] Membangun image dan menjalankan container..."
    docker compose up -d --build
    echo "[3/3] Status container:"
    docker compose ps
    echo "=== Sukses! Aplikasi berjalan di http://localhost:3000 ==="
    exit 0
fi

# 2. Jika tanpa Docker, gunakan Node.js + PM2
echo "[1/3] Docker tidak terdeteksi. Memeriksa Node.js..."

if ! command -v node &> /dev/null; then
    echo "Node.js belum terpasang. Menginstall Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Versi Node.js: $(node -v)"
echo "Versi NPM: $(npm -v)"

# Install PM2 jika belum ada
if ! command -v pm2 &> /dev/null; then
    echo "Menginstall PM2 globally..."
    sudo npm install -g pm2
fi

# Setup backend server
echo "[2/3] Menginstall dependensi server..."
cd server
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "PERINGATAN: Silakan edit 'server/.env' sebelum menjalankan produksi."
fi

npm install --omit=dev

# Jalankan dengan PM2
echo "[3/3] Menjalankan server dengan PM2..."
pm2 start index.js --name "maklon-control-room" || pm2 restart "maklon-control-room"
pm2 save
pm2 startup | tail -n 1 | bash || true

echo "=== Sukses! Aplikasi berjalan via PM2 di port 3000 ==="
pm2 status
