#!/usr/bin/env node
/**
 * GOOGLE FLOW AUTOPILOT — STANDALONE CLI & BRIDGE SERVER (Zero-Dependency)
 * Bisa dipakai di project mana pun untuk menggerakkan Chrome Extension Google Flow Autopilot secara otomatis!
 *
 * Cara Pakai (CLI 1 Baris):
 *   node flow-autopilot-cli.mjs --photo "./foto_avatar.jpg" --prompt "Medium close-up vertical 9:16 video... He says: \"Halo semua!\""
 *
 * Cara Pakai Berantai (2 Video Sekaligus: Hook -> CTA):
 *   node flow-autopilot-cli.mjs --photo "./foto_avatar.jpg" --prompt "Prompt Video 1" --cta "Prompt Video 2"
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const key = a.slice(2);
  const next = process.argv[i + 1];
  if (next && !next.startsWith('--')) {
    args[key] = next;
    i++;
  } else {
    args[key] = true;
  }
}

const PORT = Number(args.port || 3210);
const photoPath = args.photo ? path.resolve(String(args.photo)) : '';
const photoName = photoPath && fs.existsSync(photoPath) ? path.basename(photoPath) : '';
const promptText = String(args.prompt || '');
const ctaText = String(args.cta || '');

if (!promptText && !args.downloadNow) {
  console.log(`
⚡ GOOGLE FLOW AUTOPILOT CLI (Standalone Bridge)
Pemakaian:
  node flow-autopilot-cli.mjs --photo "./avatar.jpg" --prompt "Prompt video 1..." [--cta "Prompt video 2..."]
  node flow-autopilot-cli.mjs --downloadNow
  `);
  process.exit(0);
}

let queueItem = {
  time: Date.now(),
  deliverableId: `job-${Date.now()}`,
  slot: 'hook',
  avatarFile: photoName || 'reference.jpg',
  avatarUrl: photoName ? `http://localhost:${PORT}/api/avatar/${encodeURIComponent(photoName)}` : '',
  prompt: promptText,
  ctaPrompt: ctaText,
  ...(args.downloadNow ? { action: 'DOWNLOAD_NOW' } : {}),
};

let expectedDownloads = ctaText ? 2 : 1;
let completedDownloads = 0;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const u = new URL(req.url || '/', `http://localhost:${PORT}`);

  // 1. Endpoint antrean tugas untuk di-poll oleh background.js / content.js
  if (u.pathname === '/api/flow-queue' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (queueItem) {
      const sent = queueItem;
      queueItem = null; // Hanya dikirim sekali
      console.log(`📡 Tugas dikirim ke Chrome Extension! (Slot: ${sent.slot})`);
      res.end(JSON.stringify(sent));
    } else {
      res.end(JSON.stringify({}));
    }
    return;
  }

  // 2. Endpoint penyedia file foto referensi
  if (u.pathname.startsWith('/api/avatar/') && req.method === 'GET') {
    if (photoPath && fs.existsSync(photoPath)) {
      const ext = path.extname(photoPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(photoPath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  // 3. Endpoint laporan slot aktif
  if (u.pathname === '/api/flow-slot' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        console.log(`🎯 Extension mulai memproses slot: [${String(d.slot || '').toUpperCase()}]`);
      } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // 4. Endpoint laporan status real-time dari content.js
  if (u.pathname === '/api/flow-status' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        console.log(`🤖 [${String(d.slot || 'FLOW').toUpperCase()} - ${d.stage}] ${d.message}`);
        if (d.stage === 'downloaded') {
          completedDownloads++;
          if (completedDownloads >= expectedDownloads) {
            console.log('🎉 Semua video 720p telah selesai didownload! Menutup server dalam 3 detik...');
            setTimeout(() => process.exit(0), 3000);
          }
        } else if (d.stage === 'error') {
          console.error('❌ Autopilot berhenti karena error di atas.');
          setTimeout(() => process.exit(1), 1500);
        }
      } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // 5. Endpoint verifikasi download (default: accept di mode standalone)
  if (u.pathname === '/api/flow-verify-download' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ verdict: 'accept' }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`⚡ Google Flow Autopilot Bridge berjalan di http://localhost:${PORT}`);
  console.log(`👉 Pastikan Chrome dengan extension Google Flow Autopilot sedang membuka https://flow.google.com`);
});
