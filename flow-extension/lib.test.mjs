import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { computeTargetDuration, resolveDuration, apiUrl } = require('./lib.js');

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
