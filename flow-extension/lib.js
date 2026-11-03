// Fungsi murni yang dipakai content.js (global) dan diuji di Node (module.exports): `node --test flow-extension/`.

// Hitung durasi optimal (4s, 6s, 8s, 10s) sesuai panjang kalimat naskah dalam tanda kutip
function computeTargetDuration(promptText) {
  if (!promptText) return '8s';
  const match = promptText.match(/"([^"]+)"/);
  const spoken = match ? match[1] : promptText;
  const wordCount = spoken.trim().split(/\s+/).filter(Boolean).length;
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeTargetDuration, resolveDuration, apiUrl };
}
