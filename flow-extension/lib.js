// Fungsi murni yang dipakai content.js (global) dan diuji di Node (module.exports): `node --test flow-extension/`.

const SPEECH_VERB = /\b(says?|said|saying|repl(?:y|ies|ied)|asks?|asked|shouts?|yells?|whispers?|counts?|answers?|speaks?|sings?|exclaims?|announces?|narrates?|berkata|bilang|menjawab|mengatakan|berteriak|berbisik)\b/i;

// Kutipan dihitung sebagai dialog bila klausanya memuat kata kerja bicara (She says ...: "..."),
// jadi teks layar ("HPP MAHAL!") tidak ikut. Tanpa dialog terdeteksi: kutipan pertama seperti sebelumnya.
function spokenText(promptText) {
  const quotes = [...promptText.matchAll(/["“]([^"”]+)["”]/g)];
  if (!quotes.length) return promptText;
  const dialog = [];
  let prevEnd = 0;
  for (const q of quotes) {
    const clause = promptText.slice(prevEnd, q.index).split(/[.!?\]]/).pop();
    if (SPEECH_VERB.test(clause)) dialog.push(q[1]);
    prevEnd = q.index + q[0].length;
  }
  return dialog.length ? dialog.join(' ') : quotes[0][1];
}

// Hitung durasi optimal (4s, 6s, 8s, 10s) dari total kata semua dialog dalam tanda kutip
function computeTargetDuration(promptText) {
  if (!promptText) return '8s';
  const wordCount = spokenText(promptText).trim().split(/\s+/).filter(Boolean).length;
  if (wordCount <= 9) return '4s';
  if (wordCount <= 14) return '6s';
  if (wordCount <= 21) return '8s';
  return '10s';
}

// Backend menentukan durasi untuk B-roll; talking head dihitung dari dialog.
function resolveDuration(task) {
  return (task && task.target_duration) || computeTargetDuration(task && task.prompt);
}

// Alamat backend wajib https, kecuali localhost untuk pengembangan.
function apiUrl(baseUrl, path) {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[^/]+/i.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)) {
    throw new Error('Alamat backend harus https:// (atau http://localhost untuk pengembangan).');
  }
  return `${base}/${String(path || '').replace(/^\/+/, '')}`;
}

// Push ganda untuk job yang SEDANG berjalan diabaikan; job yang sama yang diklaim ulang setelah gagal (retry) tidak.
function isDuplicateTask(runningJobId, task) {
  if (!task || !task.job_id) return true;
  return Boolean(runningJobId) && task.job_id === runningJobId;
}

// Background hanya mengklaim job baru bila tidak ada job aktif dan device tidak sedang dijeda (captcha).
function claimAllowed(state, now) {
  const s = state || {};
  return !s.activeJobId && !(s.pausedUntil && s.pausedUntil > now);
}

// 404/409 dari backend: job sudah bukan milik device ini (lease habis, render ulang, device dinonaktifkan).
function ownershipLost(res) {
  return Boolean(res) && (res.status === 404 || res.status === 409);
}

function baseName(path) {
  return String(path || '').split(/[\\/]/).pop();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeTargetDuration, resolveDuration, apiUrl, isDuplicateTask, claimAllowed, ownershipLost, baseName };
}
