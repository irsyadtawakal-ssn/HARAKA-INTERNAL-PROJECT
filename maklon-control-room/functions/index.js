/**
 * Cloud Functions Maklon Control Room
 *  - ai          : dipanggil web app untuk menulis pesan WA / brief pabrik (Anthropic API, key aman di server)
 *  - waAutoSend  : (opsional) tiap pagi mengirim follow-up WA yang jatuh tempo + update progres via WA gateway
 *
 * Secret yang perlu diset (lihat README):
 *   firebase functions:secrets:set ANTHROPIC_API_KEY
 *   firebase functions:secrets:set FONNTE_TOKEN        (hanya jika WA otomatis dipakai)
 * Variabel lingkungan di functions/.env:
 *   OWNER_EMAILS=akbaragency@gmail.com
 *   WA_AUTO_SEND=false          -> ubah ke true untuk mengaktifkan kirim otomatis follow-up
 *   WA_AUTO_PROGRESS=false      -> true untuk ikut mengirim otomatis update progres pabrik
 *   AI_MODEL=claude-haiku-5-5
 */
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const FONNTE_TOKEN = defineSecret('FONNTE_TOKEN');
const REGION = 'asia-southeast2'; // Jakarta

const owners = () => (process.env.OWNER_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

async function hasRole(uid, email) {
  if (owners().includes((email || '').toLowerCase())) return true;
  const r = await db.doc(`roles/${uid}`).get();
  return r.exists;
}

// ---------------- AI ----------------
exports.ai = onRequest({ region: REGION, cors: true, secrets: [ANTHROPIC_API_KEY], maxInstances: 5 }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const token = (req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  let user;
  try { user = await admin.auth().verifyIdToken(token); } catch (e) { return res.status(401).json({ error: 'unauthorized' }); }
  if (!(await hasRole(user.uid, user.email))) return res.status(403).json({ error: 'no_role' });

  const prompt = String((req.body && req.body.prompt) || '').slice(0, 8000);
  if (!prompt) return res.status(400).json({ error: 'empty_prompt' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY.value(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-haiku-5-5', max_tokens: 600, messages: [{ role: 'user', content: prompt }] })
    });
    const j = await r.json();
    if (r.status === 429) return res.status(429).json({ error: 'rate_limited' });
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'ai_error' });
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
    return res.json({ text });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'ai_error' });
  }
});

// ---------------- WA otomatis (opsional) ----------------
function waNum(s) {
  let d = String(s || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  if (d.startsWith('8')) d = '62' + d;
  return d;
}
// Fonnte: https://docs.fonnte.com — cek ulang format endpoint di dokumentasi terbaru sebelum dipakai.
async function sendWA(target, message) {
  const body = new URLSearchParams({ target, message, countryCode: '62' });
  const r = await fetch('https://api.fonnte.com/send', { method: 'POST', headers: { Authorization: FONNTE_TOKEN.value() }, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status === false) throw new Error(j.reason || `HTTP ${r.status}`);
  return j;
}
const todayJakarta = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

exports.waAutoSend = onSchedule({ region: REGION, schedule: 'every day 09:00', timeZone: 'Asia/Jakarta', secrets: [FONNTE_TOKEN] }, async () => {
  if (process.env.WA_AUTO_SEND !== 'true') return;
  const today = todayJakarta();
  const custCache = {};
  const getCust = async id => (custCache[id] ??= (await db.doc(`customers/${id}`).get()).data() || {});

  // 1) Follow-up yang jatuh tempo
  const fu = await db.collection('followups').where('status', '==', 'pending').get();
  for (const doc of fu.docs) {
    const f = doc.data();
    if (!f.due || f.due > today) continue;
    const c = await getCust(f.customerId);
    const to = waNum(c.wa);
    if (!to) { await doc.ref.update({ hasil: 'Nomor WA kosong, kirim manual' }); continue; }
    try {
      await sendWA(to, f.pesan);
      await doc.ref.update({ status: 'sent', sentAt: new Date().toISOString(), hasil: 'Terkirim otomatis', sentBy: 'system' });
    } catch (e) { await doc.ref.update({ hasil: 'Gagal kirim otomatis: ' + e.message }); }
  }

  // 2) Update progres dari pabrik
  if (process.env.WA_AUTO_PROGRESS !== 'true') return;
  const ob = await db.collection('outbox').where('status', '==', 'draft').get();
  for (const doc of ob.docs) {
    const o = doc.data();
    const c = await getCust(o.customerId);
    const to = waNum(c.wa);
    if (!to || !o.pesan) continue;
    try {
      await sendWA(to, o.pesan);
      await doc.ref.update({ status: 'sent', sentAt: new Date().toISOString(), sentBy: 'system' });
    } catch (e) { console.error('outbox', doc.id, e.message); }
  }
});
