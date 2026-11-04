// Popup Controller — Memungkinkan penggunaan mandiri tanpa server maupun dengan server
const avatarInput = document.getElementById('avatarInput');
const promptInput = document.getElementById('promptInput');
const ctaInput = document.getElementById('ctaInput');
const runBtn = document.getElementById('runBtn');
const dlBtn = document.getElementById('dlBtn');
const msgEl = document.getElementById('msg');

let cachedDataUrl = '';
let cachedFileName = '';

// Muat input terakhir dari storage agar tidak hilang saat popup tertutup
chrome.storage?.local?.get(['savedPrompt', 'savedCta', 'savedAvatarDataUrl', 'savedAvatarName'], (res) => {
  if (res.savedPrompt) promptInput.value = res.savedPrompt;
  if (res.savedCta) ctaInput.value = res.savedCta;
  if (res.savedAvatarDataUrl) cachedDataUrl = res.savedAvatarDataUrl;
  if (res.savedAvatarName) cachedFileName = res.savedAvatarName;
});

promptInput.addEventListener('input', () => {
  chrome.storage?.local?.set({ savedPrompt: promptInput.value });
});
ctaInput.addEventListener('input', () => {
  chrome.storage?.local?.set({ savedCta: ctaInput.value });
});

avatarInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  cachedFileName = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    cachedDataUrl = reader.result;
    chrome.storage?.local?.set({
      savedAvatarDataUrl: cachedDataUrl,
      savedAvatarName: cachedFileName,
    });
    msgEl.style.color = '#34d399';
    msgEl.textContent = `✅ Foto siap: ${cachedFileName}`;
  };
  reader.readAsDataURL(file);
});

runBtn.addEventListener('click', () => {
  const prompt = promptInput.value.trim();
  const ctaPrompt = ctaInput.value.trim();
  if (!prompt) {
    msgEl.style.color = '#f87171';
    msgEl.textContent = '⚠️ Isi Prompt Video 1 terlebih dahulu!';
    return;
  }

  const payload = {
    prompt,
    ctaPrompt,
    avatarFile: cachedFileName || 'reference_avatar.jpg',
    avatarUrl: cachedDataUrl || '',
    slot: 'hook',
  };

  msgEl.style.color = '#fbbf24';
  msgEl.textContent = '⏳ Mengirim tugas ke tab Google Flow...';

  chrome.runtime.sendMessage({ action: 'TRIGGER_FROM_POPUP', data: payload }, (res) => {
    if (res && res.ok) {
      msgEl.style.color = '#34d399';
      msgEl.textContent = '🚀 Autopilot berjalan di tab Google Flow!';
    } else {
      msgEl.style.color = '#f87171';
      msgEl.textContent = res?.error || '⚠️ Buka tab flow.google.com terlebih dahulu!';
    }
  });
});

dlBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'TRIGGER_FROM_POPUP', data: { action: 'DOWNLOAD_NOW' } }, (res) => {
    if (res && res.ok) {
      msgEl.style.color = '#34d399';
      msgEl.textContent = '📥 Memicu evaluasi & download 720p di tab Flow!';
    } else {
      msgEl.style.color = '#f87171';
      msgEl.textContent = res?.error || '⚠️ Buka tab flow.google.com terlebih dahulu!';
    }
  });
});
