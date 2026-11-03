// Background Service Worker — jembatan ber-token ke backend Haraka Factory.
// Satu-satunya jalur ke API backend (X-Device-Token tidak pernah masuk ke halaman Flow).
importScripts('lib.js');
console.log('⚡ [Haraka Flow] Background Service Worker v4.0 aktif...');

const FLOW_TABS = ['*://flow.google.com/*', '*://labs.google/*'];
let claiming = false;

function getConfig() {
  return chrome.storage.local.get(['backendUrl', 'deviceToken', 'activeJobId', 'pausedUntil']);
}

// Chrome restart / extension dipasang ulang: job lama sudah tidak dikerjakan siapa pun.
// Klaim berikutnya membuat backend menggugurkan job aktif device ini lebih awal daripada menunggu lease.
chrome.runtime.onStartup.addListener(() => chrome.storage.local.remove(['activeJobId', 'activeJobSince']));
chrome.runtime.onInstalled.addListener(() => chrome.storage.local.remove(['activeJobId', 'activeJobSince']));

async function callApi(method, path, body) {
  const { backendUrl, deviceToken } = await getConfig();
  if (!backendUrl || !deviceToken) return { ok: false, status: 0, data: { detail: 'Backend URL / token device belum diisi di popup.' } };
  try {
    const res = await fetch(apiUrl(backendUrl, path), {
      method,
      cache: 'no-store',
      headers: { 'X-Device-Token': deviceToken, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { detail: String((e && e.message) || e) } };
  }
}

// Ambil job baru hanya bila tidak ada job aktif / jeda captcha, lalu kirim ke tab Flow yang mengirim heartbeat
// (tab itu pasti punya content script yang hidup).
async function claimIfIdle(tabId) {
  if (claiming || !tabId) return;
  claiming = true;
  try {
    if (!claimAllowed(await getConfig(), Date.now())) return;
    const r = await callApi('POST', '/flow/claim');
    if (!r.ok || !r.data || !r.data.job) return;
    const task = r.data.job;
    await chrome.storage.local.set({ activeJobId: task.job_id, activeJobSince: Date.now() });
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'INJECT_PROMPT', data: task });
    } catch (e) {
      // Job tidak sampai ke halaman: kembalikan ke antrian sekarang, jangan menunggu lease 15 menit.
      await callApi('POST', `/flow/jobs/${task.job_id}/status`, { stage: 'failed', message: 'Tab Flow tidak merespons (muat ulang tab Flow)' });
      await chrome.storage.local.remove(['activeJobId', 'activeJobSince']);
    }
  } finally {
    claiming = false;
  }
}

// Catat kapan Chrome benar-benar memulai sebuah download
let lastDownload = { at: 0, id: 0, name: '' };
if (chrome.downloads && chrome.downloads.onCreated) {
  chrome.downloads.onCreated.addListener((item) => {
    lastDownload = { at: Date.now(), id: item.id, name: item.filename || '' };
  });
  // Nama file final (setelah uniquify) baru diketahui lewat onChanged.
  chrome.downloads.onChanged.addListener((delta) => {
    if (delta.id === lastDownload.id && delta.filename && delta.filename.current) lastDownload.name = delta.filename.current;
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Heartbeat content.js tiap 1,2 detik: menjaga Service Worker tetap bangun + kesempatan klaim job.
  if (msg && msg.action === 'POLL_QUEUE') {
    claimIfIdle(sender.tab && sender.tab.id).finally(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg && msg.action === 'API') {
    callApi(msg.method || 'GET', msg.path, msg.body).then(sendResponse);
    return true;
  }

  if (msg && msg.action === 'JOB_FINISHED') {
    chrome.storage.local.get(['activeJobId'], (s) => {
      if (!msg.jobId || s.activeJobId === msg.jobId) chrome.storage.local.remove(['activeJobId', 'activeJobSince']);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg && msg.action === 'PAUSE_CLAIMS') {
    chrome.storage.local.set({ pausedUntil: Date.now() + (msg.minutes || 30) * 60 * 1000 }, () => sendResponse({ ok: true }));
    return true;
  }

  if (msg && msg.action === 'LAST_DOWNLOAD') {
    sendResponse({ ok: true, hasApi: Boolean(chrome.downloads), last: lastDownload });
    return false;
  }

  // Fallback unduh langsung dari URL video bila klik menu UI tidak memicu download
  if (msg && msg.action === 'DOWNLOAD_URL') {
    if (!chrome.downloads) {
      sendResponse({ ok: false, error: 'izin "downloads" belum aktif (muat ulang extension)' });
      return false;
    }
    chrome.downloads.download({ url: msg.url, filename: msg.filename, conflictAction: 'uniquify', saveAs: false }, (id) => {
      if (chrome.runtime.lastError || !id) {
        sendResponse({ ok: false, error: (chrome.runtime.lastError && chrome.runtime.lastError.message) || 'download tidak dimulai' });
        return;
      }
      const onChanged = (delta) => {
        if (delta.id !== id || !delta.state) return;
        if (delta.state.current === 'complete' || delta.state.current === 'interrupted') {
          chrome.downloads.onChanged.removeListener(onChanged);
          sendResponse({ ok: delta.state.current === 'complete', id, error: delta.state.current === 'interrupted' ? 'download terputus' : '' });
        }
      };
      chrome.downloads.onChanged.addListener(onChanged);
      setTimeout(() => {
        chrome.downloads.onChanged.removeListener(onChanged);
        try { sendResponse({ ok: false, error: 'waktu habis' }); } catch (e) {}
      }, 60000);
    });
    return true;
  }
});

// Job aktif yang macet (tab ditutup / content script mati) dilepas setelah 20 menit;
// backend sudah mengembalikan job ke antrian setelah lease 15 menit habis.
setInterval(async () => {
  const s = await chrome.storage.local.get(['activeJobId', 'activeJobSince']);
  if (s.activeJobId && Date.now() - (s.activeJobSince || 0) > 20 * 60 * 1000) {
    await chrome.storage.local.remove(['activeJobId', 'activeJobSince']);
  }
}, 60000);
