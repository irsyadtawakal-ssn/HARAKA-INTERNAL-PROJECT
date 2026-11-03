// Background Service Worker — jembatan ber-token ke backend Haraka Factory.
// Satu-satunya jalur ke API backend (X-Device-Token tidak pernah masuk ke halaman Flow).
importScripts('lib.js');
console.log('⚡ [Haraka Flow] Background Service Worker v4.0 aktif...');

const FLOW_TABS = ['*://flow.google.com/*', '*://labs.google/*'];
let claiming = false;

function getConfig() {
  return chrome.storage.local.get(['backendUrl', 'deviceToken', 'activeJobId']);
}

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

// Ambil job baru hanya bila tidak ada job aktif dan tab Flow terbuka.
async function claimIfIdle() {
  if (claiming) return;
  claiming = true;
  try {
    const { activeJobId } = await getConfig();
    if (activeJobId) return;
    const tabs = await chrome.tabs.query({ url: FLOW_TABS });
    const tab = tabs.find((t) => t.id);
    if (!tab) return;
    const r = await callApi('POST', '/flow/claim');
    if (!r.ok || !r.data || !r.data.job) return;
    const task = r.data.job;
    await chrome.storage.local.set({ activeJobId: task.job_id, activeJobSince: Date.now() });
    // Satu tab Flow saja yang mengerjakan job.
    chrome.tabs.sendMessage(tab.id, { action: 'INJECT_PROMPT', data: task }).catch(() => {});
  } finally {
    claiming = false;
  }
}

// Catat kapan Chrome benar-benar memulai sebuah download
let lastDownload = { at: 0, id: 0, name: '' };
if (chrome.downloads && chrome.downloads.onCreated) {
  chrome.downloads.onCreated.addListener((item) => {
    lastDownload = { at: Date.now(), id: item.id, name: item.filename || item.finalUrl || item.url || '' };
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Heartbeat content.js tiap 1,2 detik: menjaga Service Worker tetap bangun + kesempatan klaim job.
  if (msg && msg.action === 'POLL_QUEUE') {
    claimIfIdle().finally(() => sendResponse({ ok: true }));
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
