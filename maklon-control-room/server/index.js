/**
 * Maklon Control Room — Standalone Server untuk VPS
 * Menyediakan:
 *  1. POST /api/ai (atau /ai) : Proxy Anthropic API dengan verifikasi Firebase ID Token
 *  2. Cron Job WA             : Otomatis kirim follow-up & update progres tiap 09:00 WIB via Fonnte
 *  3. Static Web Server       : Menyajikan folder ../web jika dijalankan langsung
 *  4. GET /api/health         : Health check endpoint
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const admin = require('firebase-admin');

// ---------- Inisialisasi Firebase Admin ----------
try {
  let credential = null;
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'service-account.json');
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (saJson) {
    // Bisa berupa JSON string langsung atau base64
    const parsed = saJson.trim().startsWith('{') ? JSON.parse(saJson) : JSON.parse(Buffer.from(saJson, 'base64').toString('utf8'));
    credential = admin.credential.cert(parsed);
    console.log('[Firebase] Menggunakan service account dari FIREBASE_SERVICE_ACCOUNT_JSON');
  } else if (fs.existsSync(saPath)) {
    credential = admin.credential.cert(require(path.resolve(saPath)));
    console.log(`[Firebase] Menggunakan service account dari ${saPath}`);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault();
    console.log('[Firebase] Menggunakan GOOGLE_APPLICATION_CREDENTIALS');
  }

  if (credential) {
    admin.initializeApp({ credential });
  } else {
    admin.initializeApp();
    console.warn('[Firebase] Peringatan: Tidak ada file service-account.json ditemukan. Menggunakan default initialization.');
  }
} catch (err) {
  console.error('[Firebase Init Error]', err);
}

const db = admin.firestore();

// ---------- Konfigurasi ----------
const PORT = process.env.PORT || 3000;
const OWNER_EMAILS = () => (process.env.OWNER_EMAILS || 'creatormpb25@gmail.com').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const FONNTE_TOKEN = process.env.FONNTE_TOKEN || '';
const AI_MODEL = process.env.AI_MODEL || 'claude-haiku-5-5';
const WA_AUTO_SEND = process.env.WA_AUTO_SEND === 'true';
const WA_AUTO_PROGRESS = process.env.WA_AUTO_PROGRESS === 'true';
const SERVE_STATIC = process.env.SERVE_STATIC !== 'false';

// Helper cek role
async function hasRole(uid, email) {
  if (OWNER_EMAILS().includes((email || '').toLowerCase())) return true;
  try {
    const r = await db.doc(`roles/${uid}`).get();
    return r.exists;
  } catch (err) {
    console.error('[hasRole Error]', err);
    return false;
  }
}

// Helper format nomor WA
function waNum(s) {
  let d = String(s || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  if (d.startsWith('8')) d = '62' + d;
  return d;
}

// Helper kirim WA via Fonnte
async function sendWA(target, message) {
  if (!FONNTE_TOKEN) {
    throw new Error('FONNTE_TOKEN belum dikonfigurasi di server.');
  }
  const body = new URLSearchParams({ target, message, countryCode: '62' });
  const r = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { Authorization: FONNTE_TOKEN },
    body
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status === false) {
    throw new Error(j.reason || `HTTP ${r.status}`);
  }
  return j;
}

const todayJakarta = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

// Logika tugas harian WA (Follow-up + Outbox Progress)
async function runDailyWhatsAppJobs() {
  console.log(`[WA Cron] Memulai pemeriksaan tugas WhatsApp harian (${todayJakarta()})...`);
  const today = todayJakarta();
  const custCache = {};
  const getCust = async id => (custCache[id] ??= (await db.doc(`customers/${id}`).get()).data() || {});

  // 1. Follow-up yang jatuh tempo
  if (WA_AUTO_SEND) {
    try {
      const fu = await db.collection('followups').where('status', '==', 'pending').get();
      let sentCount = 0;
      for (const doc of fu.docs) {
        const f = doc.data();
        if (!f.due || f.due > today) continue;
        const c = await getCust(f.customerId);
        const to = waNum(c.wa);
        if (!to) {
          await doc.ref.update({ hasil: 'Nomor WA kosong, kirim manual' });
          continue;
        }
        try {
          await sendWA(to, f.pesan);
          await doc.ref.update({
            status: 'sent',
            sentAt: new Date().toISOString(),
            hasil: 'Terkirim otomatis (VPS)',
            sentBy: 'system'
          });
          sentCount++;
        } catch (e) {
          console.error(`[WA Cron] Gagal kirim ke ${to}:`, e.message);
          await doc.ref.update({ hasil: 'Gagal kirim otomatis: ' + e.message });
        }
      }
      console.log(`[WA Cron] Selesai: ${sentCount} pesan follow-up terkirim.`);
    } catch (err) {
      console.error('[WA Cron Error - Followup]', err);
    }
  } else {
    console.log('[WA Cron] WA_AUTO_SEND tidak aktif (false). Melewati follow-up.');
  }

  // 2. Update progres pabrik ke pelanggan (outbox)
  if (WA_AUTO_PROGRESS) {
    try {
      const ob = await db.collection('outbox').where('status', '==', 'draft').get();
      let progressCount = 0;
      for (const doc of ob.docs) {
        const o = doc.data();
        const c = await getCust(o.customerId);
        const to = waNum(c.wa);
        if (!to || !o.pesan) continue;
        try {
          await sendWA(to, o.pesan);
          await doc.ref.update({
            status: 'sent',
            sentAt: new Date().toISOString(),
            sentBy: 'system'
          });
          progressCount++;
        } catch (e) {
          console.error('[WA Cron Error - Outbox]', doc.id, e.message);
        }
      }
      console.log(`[WA Cron] Selesai: ${progressCount} pesan update progres terkirim.`);
    } catch (err) {
      console.error('[WA Cron Error - Outbox]', err);
    }
  }
}

// ---------- Express App Setup ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    aiConfigured: Boolean(ANTHROPIC_API_KEY),
    waAutoSend: WA_AUTO_SEND,
    waAutoProgress: WA_AUTO_PROGRESS
  });
});

// Middleware Handler AI
async function handleAIRequest(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY belum diisi di server VPS' });
  }

  const token = (req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'missing_token' });
  }

  let user;
  try {
    user = await admin.auth().verifyIdToken(token);
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const allowed = await hasRole(user.uid, user.email);
  if (!allowed) {
    return res.status(403).json({ error: 'no_role' });
  }

  const prompt = String((req.body && req.body.prompt) || '').slice(0, 8000);
  if (!prompt) {
    return res.status(400).json({ error: 'empty_prompt' });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const j = await r.json();
    if (r.status === 429) return res.status(429).json({ error: 'rate_limited' });
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'ai_error' });

    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
    return res.json({ text });
  } catch (e) {
    console.error('[AI Handler Error]', e);
    return res.status(502).json({ error: 'ai_error', detail: e.message });
  }
}

// Dukung route /api/ai maupun /ai langsung
app.post('/api/ai', handleAIRequest);
app.post('/ai', handleAIRequest);

// Endpoint manual trigger cron WA (hanya untuk admin terotorisasi)
app.post('/api/trigger-wa', async (req, res) => {
  const token = (req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  try {
    const user = await admin.auth().verifyIdToken(token);
    if (!OWNER_EMAILS().includes((user.email || '').toLowerCase())) {
      return res.status(403).json({ error: 'owner_only' });
    }
    // Jalankan di background
    runDailyWhatsAppJobs();
    res.json({ message: 'Proses kirim WA harian dipicu.' });
  } catch (err) {
    res.status(401).json({ error: 'unauthorized' });
  }
});

// Endpoint membuat user langsung oleh Owner (tanpa staf perlu email asli / registrasi)
app.post('/api/create-user', async (req, res) => {
  const token = (req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  try {
    const user = await admin.auth().verifyIdToken(token);
    if (!OWNER_EMAILS().includes((user.email || '').toLowerCase())) {
      return res.status(403).json({ error: 'owner_only' });
    }

    const { username, password, name, role } = req.body || {};
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Data tidak lengkap (username, password, dan role wajib diisi)' });
    }

    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const email = username.includes('@') ? username.trim().toLowerCase() : `${cleanUser}@haraka.com`;
    const displayName = (name || cleanUser).trim();

    // Buat akun di Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password: String(password).trim(),
      displayName
    });

    // Simpan role di Firestore langsung
    await db.doc(`roles/${userRecord.uid}`).set({ role, at: new Date().toISOString() });
    await db.doc(`users/${userRecord.uid}`).set({ name: displayName, email, lastLogin: new Date().toISOString() }, { merge: true });

    console.log(`[Create User] Sukses membuat user: ${displayName} (${email}) sebagai ${role}`);
    res.json({ success: true, uid: userRecord.uid, username: cleanUser, email, role });
  } catch (err) {
    console.error('[create-user error]', err);
    res.status(500).json({ error: err.message || 'Gagal membuat user' });
  }
});

// Menyajikan Frontend Statis (jika diaktifkan)
if (SERVE_STATIC) {
  const webDir = path.join(__dirname, '..', 'web');
  app.use(express.static(webDir));

  // Fallback untuk SPA
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(webDir, 'index.html'));
  });
}

// ---------- Scheduler Cron (Setiap Jam 09:00 WIB) ----------
// Cron syntax: Detik Menit Jam Hari Bulan HariMinggu
// Di node-cron: Menit Jam Hari Bulan HariMinggu -> '0 9 * * *'
cron.schedule('0 9 * * *', () => {
  console.log('[Scheduler] Menjalankan cron WA harian pukul 09:00 WIB...');
  runDailyWhatsAppJobs();
}, {
  scheduled: true,
  timezone: 'Asia/Jakarta'
});

console.log('[Scheduler] Cron job WA otomatis terpasang: Setiap hari pukul 09:00 WIB.');

// ---------- Start Server ----------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Maklon Control Room Server berjalan di port ${PORT}`);
  console.log(`   - AI Model      : ${AI_MODEL}`);
  console.log(`   - WA Auto Send  : ${WA_AUTO_SEND}`);
  console.log(`   - Owner Emails  : ${OWNER_EMAILS().join(', ')}`);
  console.log(`   - Static Web    : ${SERVE_STATIC ? 'Aktif' : 'Non-aktif'}`);
  console.log(`   - Health check  : http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
