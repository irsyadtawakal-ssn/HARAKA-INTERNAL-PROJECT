// Popup: atur alamat backend + token device, lalu uji koneksi lewat GET /flow/ping.
const backendInput = document.getElementById('backendUrl');
const tokenInput = document.getElementById('deviceToken');
const saveBtn = document.getElementById('saveBtn');
const msgEl = document.getElementById('msg');
const jobEl = document.getElementById('job');

function say(text, color) {
  msgEl.style.color = color;
  msgEl.textContent = text;
}

chrome.storage.local.get(['backendUrl', 'deviceToken', 'activeJobId'], (s) => {
  if (s.backendUrl) backendInput.value = s.backendUrl;
  if (s.deviceToken) tokenInput.value = s.deviceToken;
  jobEl.textContent = s.activeJobId ? `Job aktif: ${s.activeJobId}` : 'Tidak ada job aktif.';
});

saveBtn.addEventListener('click', async () => {
  const backendUrl = backendInput.value.trim().replace(/\/+$/, '');
  const deviceToken = tokenInput.value.trim();
  let pingUrl;
  try {
    pingUrl = apiUrl(backendUrl, '/flow/ping');
  } catch (e) {
    say(e.message, '#f87171');
    return;
  }
  if (!deviceToken) {
    say('Isi token device terlebih dahulu.', '#f87171');
    return;
  }
  // Izin host hanya untuk origin backend ini (bukan semua situs).
  const granted = await chrome.permissions.request({ origins: [new URL(backendUrl).origin + '/*'] });
  if (!granted) {
    say('Izin akses ke alamat backend ditolak.', '#f87171');
    return;
  }
  await chrome.storage.local.set({ backendUrl, deviceToken });
  say('Menguji koneksi...', '#fbbf24');
  chrome.runtime.sendMessage({ action: 'API', method: 'GET', path: '/flow/ping' }, (res) => {
    if (res && res.ok) say(`Terhubung sebagai device "${res.data.device}".`, '#34d399');
    else say((res && res.data && res.data.detail) || `Gagal menghubungi ${pingUrl}`, '#f87171');
  });
});
