import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { computeTargetDuration, resolveDuration, apiUrl, isDuplicateTask, claimAllowed, ownershipLost, baseName } = require('./lib.js');

test('job yang sama boleh dikerjakan lagi setelah run sebelumnya selesai (retry)', () => {
  assert.equal(isDuplicateTask('A', { job_id: 'A' }), true); // push ganda saat A masih berjalan
  assert.equal(isDuplicateTask('', { job_id: 'A' }), false); // A gagal, diantrikan ulang, diklaim lagi
  assert.equal(isDuplicateTask('A', { job_id: 'B' }), false);
  assert.equal(isDuplicateTask('', {}), true); // tanpa job_id diabaikan
});

test('klaim ditahan saat ada job aktif atau device sedang dijeda karena captcha', () => {
  const now = 1_000_000;
  assert.equal(claimAllowed({}, now), true);
  assert.equal(claimAllowed({ activeJobId: 'A' }, now), false);
  assert.equal(claimAllowed({ pausedUntil: now + 1 }, now), false);
  assert.equal(claimAllowed({ pausedUntil: now - 1 }, now), true);
});

test('404/409 dari laporan status berarti job bukan milik device lagi', () => {
  assert.equal(ownershipLost({ ok: false, status: 409 }), true);
  assert.equal(ownershipLost({ ok: false, status: 404 }), true);
  assert.equal(ownershipLost({ ok: false, status: 0 }), false); // backend tak terjangkau: lanjut, lease yang memutuskan
  assert.equal(ownershipLost({ ok: true, status: 200 }), false);
  assert.equal(ownershipLost(null), false);
});

test('nama file dari path unduhan Chrome', () => {
  assert.equal(baseName('/srv/flow-downloads/video (1).mp4'), 'video (1).mp4');
  assert.equal(baseName('C:\\Users\\x\\Downloads\\a.mp4'), 'a.mp4');
  assert.equal(baseName(''), '');
});

const words = (n) => Array.from({ length: n }, (_, i) => `k${i}`).join(' ');

test('durasi dari jumlah kata dialog', () => {
  assert.equal(computeTargetDuration('x "satu dua tiga"'), '4s');
  assert.equal(computeTargetDuration(`x "${words(9)}"`), '4s');
  assert.equal(computeTargetDuration(`x "${words(14)}"`), '6s');
  assert.equal(computeTargetDuration(`x "${words(21)}"`), '8s');
  assert.equal(computeTargetDuration(`x "${words(22)}"`), '10s');
  assert.equal(computeTargetDuration(''), '8s');
});

test('target_duration dari backend menang', () => {
  assert.equal(resolveDuration({ prompt: 'x "a"', target_duration: '8s' }), '8s');
  assert.equal(resolveDuration({ prompt: `x "${words(12)}"`, target_duration: null }), '6s');
});

test('apiUrl menolak http non-lokal', () => {
  assert.throws(() => apiUrl('http://contoh.id', '/flow/claim'));
  assert.throws(() => apiUrl('', '/flow/claim'));
});

test('apiUrl menormalkan garis miring dan mengizinkan localhost', () => {
  assert.equal(apiUrl('https://api.x.id/', 'flow/claim'), 'https://api.x.id/flow/claim');
  assert.equal(apiUrl('https://api.x.id', '/flow/claim'), 'https://api.x.id/flow/claim');
  assert.equal(apiUrl('http://localhost:8010', '/flow/ping'), 'http://localhost:8010/flow/ping');
  assert.equal(apiUrl('http://127.0.0.1:8010/', '/flow/ping'), 'http://127.0.0.1:8010/flow/ping');
});
