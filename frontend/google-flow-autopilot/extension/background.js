// Background Service Worker — Never-Sleep Bridge via Content Script Heartbeat + Polling + Popup Trigger
console.log('⚡ [Google Flow Autopilot] Background Service Worker v3.0 aktif...');

let memoryQueue = null;

async function fetchQueueFromServer() {
  if (memoryQueue) {
    const item = memoryQueue;
    memoryQueue = null;
    return item;
  }
  try {
    const res = await fetch('http://localhost:3210/api/flow-queue', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && (data.prompt || data.action === 'DOWNLOAD_NOW')) {
      return data;
    }
  } catch (e) {
    // server lokal sedang tidak aktif (mode mandiri / popup)
  }
  return null;
}

// Catat kapan Chrome benar-benar memulai sebuah download
let lastDownload = { at: 0, id: 0, name: '' };
if (chrome.downloads && chrome.downloads.onCreated) {
  chrome.downloads.onCreated.addListener((item) => {
    lastDownload = { at: Date.now(), id: item.id, name: item.filename || item.finalUrl || item.url || '' };
  });
}

// 1. Terima heartbeat dari content.js & perintah dari popup.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'POLL_QUEUE') {
    fetchQueueFromServer().then((data) => {
      sendResponse({ ok: true, data });
    });
    return true;
  }

  // Perintah langsung dari Popup UI extension (tanpa butuh server localhost)
  if (msg && msg.action === 'TRIGGER_FROM_POPUP' && msg.data) {
    const payload = { ...msg.data, time: Date.now() };
    chrome.tabs.query({ url: ['*://flow.google.com/*', '*://labs.google/*'] }, (tabs) => {
      if (tabs && tabs.length > 0) {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'INJECT_PROMPT', data: payload }).catch(() => {});
          }
        }
        sendResponse({ ok: true, sentToTabs: tabs.length });
      } else {
        memoryQueue = payload;
        sendResponse({ ok: false, error: 'Tab flow.google.com belum dibuka! Silakan buka flow.google.com terlebih dahulu.' });
      }
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

// 2. Fallback polling dari background setiap 2 detik
setInterval(async () => {
  const data = await fetchQueueFromServer();
  if (data && (data.prompt || data.action === 'DOWNLOAD_NOW')) {
    const tabs = await chrome.tabs.query({ url: ['*://flow.google.com/*', '*://labs.google/*'] });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'INJECT_PROMPT', data }).catch(() => {});
      }
    }
  }
}, 2000);
