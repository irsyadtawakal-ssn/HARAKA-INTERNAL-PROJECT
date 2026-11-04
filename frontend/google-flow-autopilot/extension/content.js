// Google Flow Auto-Bridge Content Script — v2.7 (foto Start frame sesuai identitas, lapor status nyata, submenu Download, verifikasi download + cadangan unduh langsung)
console.log('⚡ [AI Video Bridge] Autopilot Rafi v2.7 (verifikasi download + cadangan unduh langsung) aktif di flow.google.com!');

let _runId = 0;
let _lastProcessedTime = 0;
const _uploadedAvatarsInSession = new Set();

// --- Identitas foto avatar (v2.4): supaya yang masuk ke Start frame SELALU foto yang diminta, bukan sekadar foto urutan pertama ---
const _avatarKeys = new Map();        // nama file avatar -> Set kunci gambar hasil upload-nya
let _currentStartAvatar = '';         // nama avatar yang terakhir dikunci Rafi di Start frame
let _modalKeysBeforeUpload = new Set(); // gambar yang SUDAH ada di jendela pilihan sebelum upload
// Kunci identitas gambar: Flow memakai ...getMediaUrlRedirect?name=<id> (id di query); bila tidak ada, pakai URL tanpa query & tanpa sufiks ukuran
const srcKey = (u) => {
  const s = String(u || '');
  const m = s.match(/[?&]name=([^&]+)/);
  if (m) return 'name:' + m[1];
  return s.split('?')[0].replace(/=[a-z0-9_-]+$/i, '');
};
const allAssetImgs = () => Array.from(document.querySelectorAll('img')).filter((img) => {
  if (!img.src || img.src.includes('googleusercontent.com/a/')) return false;
  const r = img.getBoundingClientRect();
  return r.width > 35 && r.height > 35 && img.complete;
});
// --- Lapor status SEBENARNYA ke dashboard (v2.4): 'generating' | 'warn' | 'downloaded' | 'error'. Dashboard menampilkannya & berhenti bila 'error' ---
let _curTask = {deliverableId: '', slot: 'hook'};
function reportFlow(stage, message) {
  try {
    fetch('http://localhost:3210/api/flow-status', {
      method: 'POST',
      body: JSON.stringify({deliverableId: _curTask.deliverableId, slot: _curTask.slot, stage, message: String(message || '').slice(0, 300)}),
    }).catch(() => {});
  } catch (e) {}
}
// Pilih gambar di jendela untuk avatar `name`: (1) hasil upload avatar itu, (2) gambar yang baru muncul sejak sebelum upload,
// (3) cadangan: yang TERAKHIR (foto baru ada di akhir daftar; yang pertama = foto lama)
function pickAvatarImg(imgs, name) {
  const keys = _avatarKeys.get(name);
  let t = keys ? imgs.find((i) => keys.has(srcKey(i.src))) : null;
  if (!t && _modalKeysBeforeUpload.size) {
    const fresh = imgs.filter((i) => !_modalKeysBeforeUpload.has(srcKey(i.src)));
    if (fresh.length) t = fresh[fresh.length - 1];
  }
  if (!t) t = imgs[imgs.length - 1];
  return t;
}

// 1. Terima push message dari background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'INJECT_PROMPT' && request.data) {
    handleIncomingTask(request.data);
    sendResponse({ ok: true });
  }
});

// 2. Heartbeat aktif setiap 1.2 detik ke background.js supaya Service Worker TIDAK PERNAH TIDUR
//    dan bisa dipakai berkali-kali tanpa batas!
setInterval(() => {
  try {
    chrome.runtime.sendMessage({ action: 'POLL_QUEUE' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res && res.data && (res.data.prompt || res.data.action === 'DOWNLOAD_NOW')) {
        handleIncomingTask(res.data);
      }
    });
  } catch (e) {}
}, 1200);

function handleIncomingTask(data) {
  const taskTime = data.time || Date.now();
  if (taskTime === _lastProcessedTime) return; // cegah duplikat dari heartbeat + push
  _lastProcessedTime = taskTime;

  if (data.action === 'DOWNLOAD_NOW') {
    evaluateAndDownloadBestVideoNow();
    return;
  }

  const { prompt, ctaPrompt, avatarUrl, avatarFile, deliverableId, slot } = data;
  runFullFlowPipeline(prompt, avatarUrl, avatarFile, ctaPrompt, deliverableId, slot || 'hook');
}

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

function getPromptBox() {
  const editor = document.querySelector('div.ProseMirror[contenteditable="true"], div[role="textbox"][contenteditable="true"]');
  if (!editor) return document.body;
  let cur = editor.parentElement;
  while (cur && cur !== document.body) {
    const txt = cur.textContent || '';
    // Container yang membungkus editor sekaligus slot Start / End
    if ((txt.includes('Start') && txt.includes('End')) || (cur.querySelectorAll('button').length >= 2 && (txt.includes('Video') || txt.includes('720p') || txt.includes('Frames')))) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return editor.parentElement?.parentElement || document.body;
}

// Cari kotak popup "Select a frame image" secara presisi (tidak pernah salah klik canvas belakang!)
function getFramePickerModal() {
  const dialog = document.querySelector('div[role="dialog"], [aria-modal="true"]');
  if (dialog) {
    const txt = (dialog.textContent || '').toLowerCase();
    if (txt.includes('frame') || txt.includes('upload') || txt.includes('media')) {
      return dialog;
    }
  }
  const allEls = Array.from(document.querySelectorAll('div, section, aside'));
  for (const el of allEls) {
    const txt = (el.textContent || '').toLowerCase();
    if (txt.includes('select a frame') || (txt.includes('frame image') && (txt.includes('upload') || txt.includes('media') || txt.includes('cancel')))) {
      const r = el.getBoundingClientRect();
      if (r.width >= 250 && r.height >= 200) {
        return el;
      }
    }
  }
  return null;
}

// Cari tombol slot Start (baik saat masih tulisan "Start" maupun tombol slot pertama sebelum <-> End)
function findStartSlotButton() {
  const box = getPromptBox() || document;
  const els = Array.from(box.querySelectorAll('button, div[role="button"], span, div'));
  // 1. Prioritas utama: elemen yang teksnya persis "Start"
  for (const el of els) {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (t === 'start' && el.children.length === 0) {
      return el.closest('button, div[role="button"]') || el;
    }
    if (el.tagName === 'BUTTON' && (el.getAttribute('aria-label') || '').toLowerCase().includes('start')) {
      return el;
    }
  }
  for (const el of els) {
    if ((el.textContent || '').trim() === 'Start') {
      return el.closest('button, div[role="button"]') || el;
    }
  }
  return null;
}

// Mengecek apakah slot Start sudah benar-benar berisi thumbnail foto avatar
function isStartFrameSet() {
  const box = getPromptBox() || document;
  // 1. Cek keberadaan thumbnail <img> di dalam area slot box (bukan icon avatar profil akun Google)
  const imgs = Array.from(box.querySelectorAll('img')).filter((img) => {
    if (!img.src || img.src.includes('googleusercontent.com/a/')) return false;
    const r = img.getBoundingClientRect();
    return r.width >= 16 && r.height >= 16;
  });
  if (imgs.length > 0) return true;

  // 2. Cek bila thumbnail memakai div/button/span background-image url(...)
  const styledEls = Array.from(box.querySelectorAll('div, button, span')).filter((el) => {
    const bg = el.style?.backgroundImage || (typeof window !== 'undefined' && window.getComputedStyle(el)?.backgroundImage);
    if (bg && bg.includes('url(')) {
      const r = el.getBoundingClientRect();
      return r.width >= 16 && r.height >= 16;
    }
    return false;
  });
  if (styledEls.length > 0) return true;

  // 3. Cek bila ada tombol close/clear ('×', 'x', aria-label clear/remove) di area slot frame
  const removeBtns = Array.from(box.querySelectorAll('button, div[role="button"]')).filter((b) => {
    const t = (b.textContent || '').trim().toLowerCase();
    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
    return t === '×' || t === 'x' || aria.includes('remove') || aria.includes('clear') || aria.includes('delete');
  });
  if (removeBtns.length > 0) return true;

  return false;
}

// Jika di dalam prompt box ada tombol reset/clear (x) di pojok kanan atas saat mau mulai run baru, bersihkan dulu jika perlu
async function clearExistingStartFrameIfNeeded() {
  const box = getPromptBox();
  if (!box) return;
  // Jika sudah ada gambar di slot Start dari percobaan sebelumnya yang nyangkut, klik gambar slot Start untuk ganti
  const startImgs = Array.from(box.querySelectorAll('img')).filter((img) => {
    const r = img.getBoundingClientRect();
    return r.width >= 20 && r.height >= 20;
  });
  if (startImgs.length > 0) {
    // Cari tombol close 'x' di pojok kanan atas prompt box untuk mereset slot frame
    const closeBtns = Array.from(box.querySelectorAll('button, div[role="button"]')).filter((b) => {
      const t = (b.textContent || '').trim().toLowerCase();
      return t === 'close' || t === '×' || t === 'x' || (b.getAttribute('aria-label') || '').toLowerCase().includes('clear');
    });
    if (closeBtns.length > 0) {
      closeBtns[0].click();
      await sleep(400);
    }
  }
}

function getReadyCanvasImages() {
  const box = getPromptBox();
  const modal = getFramePickerModal();
  return Array.from(document.querySelectorAll('img')).filter((img) => {
    if (!img.src || img.src.includes('googleusercontent.com/a/')) return false;
    if (box && box.contains(img)) return false;
    if (modal && modal.contains(img)) return false;
    const r = img.getBoundingClientRect();
    return r.width > 80 && r.height > 110 && img.complete && img.naturalWidth > 0;
  });
}

function getUploadProgressText() {
  const els = Array.from(document.querySelectorAll('span, div, p'));
  for (const el of els) {
    if (el.children.length === 0) {
      const t = (el.textContent || '').trim();
      if (/^\d{1,3}%$/.test(t)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return t;
      }
    }
  }
  return null;
}

async function runFullFlowPipeline(promptText, avatarUrl, avatarFile, ctaPrompt = '', deliverableId = '', slot = 'hook') {
  const myRunId = ++_runId;
  _curTask = {deliverableId, slot};
  try {
    // Beritahu server Dashboard sedang memproses slot ini (supaya file download masuk ke kotak Hook / CTA yang tepat)
    if (deliverableId || slot) {
      fetch('http://localhost:3210/api/flow-slot', {
        method: 'POST',
        body: JSON.stringify({ deliverableId, slot }),
      }).catch(() => {});
    }

    const targetDuration = computeTargetDuration(promptText);
    showNotification(
      `🤖 Rafi (Run #${myRunId} - ${slot.toUpperCase()}): Menyiapkan mode Video -> Frames (9:16, ${targetDuration}, x2)...`,
      '#8b5cf6'
    );

    // 0. Bersihkan bila ada seleksi gambar di canvas yang memicu mode Nano Banana
    const curBox = getPromptBox();
    const boxCloseBtn = curBox?.querySelector('button[aria-label="Close"], button[aria-label="close"], div[role="button"][aria-label="Close"]');
    if (boxCloseBtn) {
      boxCloseBtn.click();
      await sleep(300);
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    await sleep(400);
    if (myRunId !== _runId) return;

    // 1. ATUR SETTINGS DULU (Pastikan pilih "Video" & "Frames", BUKAN "Ingredients"!)
    await configureFlowSettings(targetDuration);
    await sleep(500);
    if (myRunId !== _runId) return;

    // 2. Ambil file foto avatar yang sesuai dengan teks prompt
    let fileObj = null;
    const targetAvatarName = avatarFile || 'akbar_leather_jacket_dark.jpg';
    try {
      const fetchUrl = avatarUrl || `http://localhost:3210/api/avatar/${targetAvatarName}`;
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const blob = await res.blob();
        fileObj = new File([blob], targetAvatarName, { type: 'image/jpeg' });
      }
    } catch (e) {
      console.warn('[AI Video Bridge] Gagal fetch avatar lokal:', e);
    }

    // 3. Pastikan foto avatar masuk langsung ke slot [Start]
    if (!isStartFrameSet()) {
      _currentStartAvatar = '';
    }
    // Start frame masih berisi foto avatar LAIN (mis. dari video sebelumnya) -> kosongkan dulu
    if (isStartFrameSet() && _currentStartAvatar !== targetAvatarName) {
      showNotification('♻️ Start frame berisi foto lain, dikosongkan dulu...', '#f59e0b');
      await clearExistingStartFrameIfNeeded();
      await sleep(600);
      _currentStartAvatar = '';
    }

    // Jika slot Start belum terisi foto target, masukkan foto langsung ke slot Start
    if (!isStartFrameSet() || _currentStartAvatar !== targetAvatarName) {
      showNotification(`📤 Memasukkan foto ${targetAvatarName} langsung ke Start Frame...`, '#3b82f6');
      const uploaded = await uploadAvatarAndWaitUntil100PercentDone(fileObj, myRunId);
      if (uploaded) _uploadedAvatarsInSession.add(targetAvatarName);
      await sleep(800);
    }
    if (myRunId !== _runId) return;

    // Jika setelah upload belum terkunci (misal modal masih terbuka meminta klik thumbnail), pilih HANYA di dalam modal
    if (!isStartFrameSet() || _currentStartAvatar !== targetAvatarName) {
      await selectImageAndClickAddToPrompt(fileObj, myRunId);
    }
    if (myRunId !== _runId) return;

    await sleep(600);

    // 4. Masukkan teks prompt ke ProseMirror (timpa bersih teks lama bila ada)
    if (promptText) {
      showNotification(`✍️ Memasukkan teks prompt Veo 3.1 (${slot.toUpperCase()})...`, '#3b82f6');
      const filled = await fillProseMirrorPrompt(promptText);
      await sleep(700);
      if (!filled) {
        const why = 'Kotak prompt di Flow tidak bisa diisi bersih (masih ada teks lama). Hapus isi kotak prompt manual (Ctrl+A lalu Delete), lalu klik Jalankan lagi.';
        showNotification('❌ ' + why, '#ef4444');
        reportFlow('error', why);
        return;
      }
    }
    if (myRunId !== _runId) return;

    // 5. HARD GUARD: Verifikasi keras bahwa slot [Start] SUDAH TERISI foto avatar sebelum klik Generate!
    if (!isStartFrameSet()) {
      showNotification(`⚠️ Slot [Start] belum terkunci foto, mencoba memilih foto ${targetAvatarName} sekali lagi...`, '#f59e0b');
      await selectImageAndClickAddToPrompt(fileObj, myRunId);
      await sleep(800);
    }
    if (!isStartFrameSet()) {
      const why = `Slot [Start] belum terisi foto avatar (${targetAvatarName}). Rafi DILARANG KERAS men-generate video kosong tanpa avatar! Silakan cek tab Flow.`;
      showNotification('❌ ' + why, '#ef4444');
      reportFlow('error', why);
      return;
    }

    // 6. Klik tombol panah putih bulat (->) untuk langsung Generate!
    const baseline = captureVideoBaseline(); // v2.8: jumlah + identitas stabil video yang SUDAH ada sebelum Generate ditekan
    const wstate = {baseline, rebased: false, since: Date.now()}; // v2.9: keadaan tunggu (dipakai ulang bila video yang terunduh ditolak dashboard)
    showNotification(`🚀 Rafi menekan tombol Generate Video (${slot.toUpperCase()})!`, '#10b981');
    await clickWhiteArrowGenerateButton();

    // 7. Tunggu video selesai digenerate, langsung evaluasi cepat & klik titik 3 -> Download -> 720p!
    reportFlow('generating', `Prompt ${slot.toUpperCase()} dikirim ke Flow, menunggu video selesai dibuat...`);
    // v2.9: setelah download dipicu, dashboard memeriksa ISI video (ucapan vs naskah slot ini). Bila ditolak (video lama), cari kandidat lain.
    let downloaded = null, hookVerifyP = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const sinceMs = Date.now();
      downloaded = await waitAndAutoSelectBestVideo720p(wstate, myRunId);
      if (myRunId !== _runId) return;
      if (!downloaded) break;
      // v3.0: untuk HOOK (masih ada CTA menunggu) verifikasi isi video berjalan di LATAR dan CTA langsung digenerate, tidak menunggu Whisper dashboard.
      if (ctaPrompt && slot === 'hook') { hookVerifyP = verifyDownloadWithDashboard(deliverableId, slot, sinceMs); break; }
      const verdict = await verifyDownloadWithDashboard(deliverableId, slot, sinceMs);
      if (verdict !== 'reject') break;
      reportFlow('warn', `Video ${slot.toUpperCase()} yang terunduh ternyata BUKAN hasil generate ini (ucapan tidak cocok dengan naskah, kemungkinan video lama). Mencari kandidat lain... (${attempt}/3)`);
      showNotification('⚠️ Video yang terunduh salah (video lama), mencari kandidat lain...', '#f59e0b');
      downloaded = null;
    }
    if (myRunId !== _runId) return;
    // v2.4: JANGAN lanjut ke CTA / mengaku "selesai" kalau video tidak jadi atau download tidak terpicu
    if (!downloaded) {
      const why = `Video ${slot.toUpperCase()} tidak selesai dibuat atau tombol Download tidak ketemu (lihat tab Flow: ada pesan error / masih memproses?).`;
      showNotification('❌ ' + why, '#ef4444');
      reportFlow('error', why);
      return;
    }
    reportFlow('downloaded', `Download video ${slot.toUpperCase()} 720p sudah dipicu.`);

    // 7. FULL AUTOPILOT BERANTAI: Kalau ini baru selesai download HOOK dan ada ctaPrompt, LANGSUNG lanjut CTA tanpa jeda lama!
    if (ctaPrompt && slot === 'hook' && myRunId === _runId) {
      showNotification(
        '🔥 Video HOOK 720p selesai didownload! LANGSUNG lanjut generate video CTA sekarang...',
        '#f59e0b'
      );
      await sleep(800); // Responsif: 800ms cukup agar unduhan tercatat di Chrome, langsung gas slot CTA!
      if (myRunId === _runId) {
        _currentStartAvatar = ''; // Reset identitas avatar terkunci agar slot CTA mengunci avatar baru
        await runFullFlowPipeline(ctaPrompt, avatarUrl, avatarFile, '', deliverableId, 'cta');
      }
    }
  } catch (err) {
    console.error('[AI Video Bridge] Error:', err);
    showNotification('⚠️ Error: ' + err.message, '#ef4444');
  }
}

// 1. Mengatur menu setting: Video -> Frames -> 9:16 -> 720p -> Durasi (4s/6s/8s/10s) -> x2
async function configureFlowSettings(targetDuration = '8s') {
  const box = getPromptBox();
  if (!box) return;

  const settingsBtn = Array.from(box.querySelectorAll('button, div[role="button"]')).find((el) => {
    const t = (el.textContent || '').trim();
    return (
      t.includes('720p') ||
      t.includes('360p') ||
      (t.includes('Video') && (t.includes('x1') || t.includes('x2') || t.includes('x3') || t.includes('x4')))
    );
  });

  if (!settingsBtn) return;

  const isMenuAlreadyOpen = document.body.textContent.includes('Generating will use');
  if (!isMenuAlreadyOpen) {
    settingsBtn.click();
    await sleep(650);
  }

  const clickSettingBtn = async (labelKeyword) => {
    const candidates = Array.from(
      document.querySelectorAll('button, div[role="button"], [role="tab"], [role="radio"], [role="option"]')
    ).filter((el) => {
      if (el === settingsBtn) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      return r.top > 150 && r.left > 200;
    });

    const target = candidates.find((el) => {
      const clean = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return clean === labelKeyword || clean.endsWith(' ' + labelKeyword) || clean.includes(labelKeyword);
    });

    if (target) {
      target.click();
      await sleep(220);
      return true;
    }
    return false;
  };

  await clickSettingBtn('Video');
  await clickSettingBtn('Frames');
  await clickSettingBtn('9:16');
  await clickSettingBtn('720p');
  await clickSettingBtn(targetDuration);
  await clickSettingBtn('x2');

  if (document.body.textContent.includes('Generating will use')) {
    settingsBtn.click();
    await sleep(350);
  }
  if (document.body.textContent.includes('Generating will use')) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    await sleep(300);
  }
}

// 2A. Upload file gambar dan tunggu sampai indikator 0% -> 100% selesai
async function uploadAvatarAndWaitUntil100PercentDone(fileObj, myRunId) {
  const beforeCount = getReadyCanvasImages().length;
  const beforeKeys = new Set(allAssetImgs().map((i) => srcKey(i.src)));
  const rememberUpload = () => {
    const nk = allAssetImgs().map((i) => srcKey(i.src)).filter((k) => !beforeKeys.has(k));
    if (nk.length) _avatarKeys.set(fileObj.name, new Set(nk));
    console.log(`[AI Video Bridge] Foto ${fileObj.name} dikenali dari ${nk.length} gambar baru.`);
  };

  let capturedInput = null;
  const clickInterceptor = (e) => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'file') {
      e.preventDefault();
      e.stopPropagation();
      capturedInput = e.target;
    }
  };
  document.addEventListener('click', clickInterceptor, true);

  try {
    const startBtn = findStartSlotButton();
    if (startBtn) {
      startBtn.click();
      await sleep(800);
    }
    // catat gambar yang SUDAH ada di jendela pilihan sebelum upload (supaya foto baru bisa dibedakan dari foto lama)
    _modalKeysBeforeUpload = new Set(Array.from((getFramePickerModal() || document).querySelectorAll('img')).map((i) => srcKey(i.src)));

    const isUploadEl = (el) => {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const aria = (el.getAttribute?.('aria-label') || '').toLowerCase();
      return (
        t === 'upload media' ||
        t === 'upload' ||
        t === '+ upload' ||
        t.includes('upload media') ||
        t.includes('upload image') ||
        aria.includes('upload')
      );
    };
    const uploadBtn = Array.from(document.querySelectorAll('button, div[role="button"], span')).find(isUploadEl);
    if (uploadBtn) {
      (uploadBtn.closest('button, div[role="button"]') || uploadBtn).click();
      await sleep(400);
    }

    const fileInput = capturedInput || document.querySelector('input[type="file"]');
    if (fileInput && fileObj) {
      const dt = new DataTransfer();
      dt.items.add(fileObj);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('[AI Video Bridge] File avatar disuntikkan ke input[type="file"]!');
    }
  } finally {
    document.removeEventListener('click', clickInterceptor, true);
  }

  await sleep(1500);

  const startWait = Date.now();
  let sawProgress = false;
  while (Date.now() - startWait < 35000) {
    if (myRunId !== _runId) return false;
    const pct = getUploadProgressText();
    if (pct) {
      sawProgress = true;
      showNotification(`⏳ Mengupload foto referensi (${pct})... Menunggu selesai...`, '#f59e0b');
      await sleep(700);
      continue;
    }

    const nowImgs = getReadyCanvasImages();
    if ((sawProgress && !pct) || nowImgs.length > beforeCount) {
      await sleep(1500);
      rememberUpload();
      showNotification('✅ Upload foto referensi 100% selesai!', '#10b981');
      return true;
    }
    await sleep(600);
  }
  return false;
}

// 2B. Klik Start -> Klik Foto di dalam Modal "Select a frame image" -> Klik Tombol Putih "Add to prompt"!
async function selectImageAndClickAddToPrompt(fileObj, myRunId) {
  const wantName = (fileObj && fileObj.name) || '';
  let chosenKey = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    if (myRunId !== _runId) return false;
    // sudah terkunci DAN memang foto yang diminta -> selesai. Terkunci tapi foto lain -> lanjut mengganti.
    if (isStartFrameSet() && _currentStartAvatar === wantName) return true;

    let addToPromptBtn = findAddToPromptButton();
    if (!addToPromptBtn) {
      let modal = getFramePickerModal();
      if (!modal) {
        const startBtn = findStartSlotButton();
        if (startBtn) {
          startBtn.click();
          await sleep(950);
          modal = getFramePickerModal();
        }
      }

      // ATURAN BESI: HANYA cari gambar di DALAM modal "Select a frame image"! DILARANG KERAS mencari di document atau mengklik canvas belakang!
      if (!modal) {
        await sleep(600);
        continue;
      }
      let modalImgs = Array.from(modal.querySelectorAll('img')).filter((img) => {
        if (!img.src || img.src.includes('googleusercontent.com/a/')) return false;
        const r = img.getBoundingClientRect();
        return r.width > 25 && r.height > 25 && img.complete;
      });

      // Cek apakah ada tab "Uploads" atau "Uploaded" di dalam modal
      const clickUploadsTabIfAvailable = async () => {
        const tabs = Array.from(modal.querySelectorAll('button, div[role="button"], span, [role="tab"]'));
        const uploadsTab = tabs.find((el) => {
          const t = (el.textContent || '').trim().toLowerCase();
          return t === 'uploads' || t === 'uploaded' || t === 'my media' || t === 'unggah';
        });
        if (uploadsTab) {
          (uploadsTab.closest('button, div[role="button"]') || uploadsTab).click();
          await sleep(600);
          return true;
        }
        return false;
      };

      let targetImg = pickAvatarImg(modalImgs, wantName);
      // Jika belum ketemu atau list kosong, coba buka tab Uploads
      if (!targetImg || modalImgs.length === 0) {
        const switched = await clickUploadsTabIfAvailable();
        if (switched) {
          modalImgs = Array.from(modal.querySelectorAll('img')).filter((img) => {
            if (!img.src || img.src.includes('googleusercontent.com/a/')) return false;
            const r = img.getBoundingClientRect();
            return r.width > 25 && r.height > 25 && img.complete;
          });
          targetImg = pickAvatarImg(modalImgs, wantName);
        }
      }
      if (targetImg) {
        chosenKey = srcKey(targetImg.src);
        console.log(`[AI Video Bridge] Memilih foto ${wantName} di dalam modal:`, targetImg.src);
        targetImg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        targetImg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        targetImg.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        targetImg.click();
        await sleep(500);
      }
    }

    // SEKARANG CARI & KLIK TOMBOL PUTIH "Add to prompt"!
    addToPromptBtn = findAddToPromptButton();
    if (addToPromptBtn) {
      console.log('[AI Video Bridge] Menekan tombol "Add to prompt"!');
      showNotification('➕ Menekan tombol "Add to prompt" untuk mengunci Start Frame!', '#10b981');
      addToPromptBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      addToPromptBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      addToPromptBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      addToPromptBtn.click();
      await sleep(1000);
    }

    if (isStartFrameSet()) {
      // verifikasi: thumbnail di Start frame harus foto yang dipilih tadi; bila beda, kosongkan lalu ulangi
      const box2 = getPromptBox();
      const thumb = box2 ? Array.from(box2.querySelectorAll('img')).find((img) => img.src && img.getBoundingClientRect().width >= 20) : null;
      if (chosenKey && thumb && srcKey(thumb.src) !== chosenKey && attempt < 3) {
        console.warn('[AI Video Bridge] Start frame berisi foto lain, mengganti...', srcKey(thumb.src), '!=', chosenKey);
        showNotification('♻️ Start frame berisi foto lain, mengganti ke foto yang benar...', '#f59e0b');
        _currentStartAvatar = '';
        await clearExistingStartFrameIfNeeded();
        await sleep(600);
        continue;
      }
      _currentStartAvatar = wantName;
      showNotification('✅ Foto referensi berhasil terkunci di Start Frame!', '#10b981');
      return true;
    }
  }
  if (isStartFrameSet() && _currentStartAvatar !== wantName) {
    showNotification('⚠️ Foto di Start frame mungkin bukan foto yang diminta. Cek di tab Flow.', '#ef4444');
  }
  return isStartFrameSet();
}

function findAddToPromptButton() {
  const els = Array.from(document.querySelectorAll('button, div[role="button"], span'));
  for (const el of els) {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const aria = (el.getAttribute?.('aria-label') || '').toLowerCase();
    if (
      t === 'add to prompt' ||
      t.includes('add to prompt') ||
      t === 'tambahkan ke prompt' ||
      t.includes('tambahkan ke prompt') ||
      t === 'use frame' ||
      t === 'select frame' ||
      aria.includes('add to prompt')
    ) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        return el.closest('button, div[role="button"]') || el;
      }
    }
  }
  return null;
}

// 3. Memasukkan teks prompt ke ProseMirror (selalu bersih & menimpa teks lama)
// v3.2: isi kotak prompt SECARA BERSIH dan PERIKSA hasilnya. Dulu isi lama ditimpa lewat innerHTML, yang tidak memperbarui status internal editor Flow:
// Flow bisa men-generate dengan teks LAMA (video baru berisi ucapan iklan sebelumnya). Sekarang: pilih semua + hapus lewat perintah editor, ketik, lalu
// pastikan isi kotak PERSIS sama dengan prompt; bila tidak, coba cara lain (maks 4x). Mengembalikan false bila tidak bisa diisi bersih.
async function fillProseMirrorPrompt(text) {
  const getEditor = () => document.querySelector('div.ProseMirror[contenteditable="true"]') || document.querySelector('div[role="textbox"][contenteditable="true"]');
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const want = norm(text);
  const isClean = (ed) => { const t = norm(ed.textContent); return t === want || (t.includes(want) && t.length < want.length + 6); };
  for (let attempt = 1; attempt <= 4; attempt++) {
    const editor = getEditor();
    if (!editor) return false;
    editor.focus(); editor.click();
    await sleep(150);
    // 1. hapus isi lama lewat perintah editor (menjaga status internal ProseMirror)
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    await sleep(150);
    if (norm(editor.textContent).length > 0) {
      // cadangan: Ctrl+A lalu Backspace sebagai kejadian keyboard
      const kd = (key, extra = {}) => editor.dispatchEvent(new KeyboardEvent('keydown', { key, code: key === 'a' ? 'KeyA' : 'Backspace', bubbles: true, cancelable: true, ...extra }));
      kd('a', { ctrlKey: true }); kd('Backspace');
      document.execCommand('selectAll', false, null); document.execCommand('delete', false, null);
      await sleep(200);
    }
    // 2. ketik teks baru
    document.execCommand('insertText', false, text);
    await sleep(300);
    if (isClean(editor)) {
      const placeholder = document.querySelector('.prosemirror-placeholder');
      if (placeholder) placeholder.style.display = 'none';
      return true;
    }
    // 3. cara lain: tempel (paste) setelah mengosongkan lagi
    document.execCommand('selectAll', false, null); document.execCommand('delete', false, null);
    await sleep(120);
    try {
      const dt = new DataTransfer(); dt.setData('text/plain', text);
      editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    } catch (e) {}
    await sleep(350);
    if (isClean(editor)) return true;
    reportFlow('warn', 'Kotak prompt belum bersih/sama dengan prompt (percobaan ' + attempt + '/4), mengulang...');
  }
  return false;
}

// 4. Menekan tombol panah putih bulat (->) di pojok kanan bawah prompt box
async function clickWhiteArrowGenerateButton() {
  const box = getPromptBox();
  if (!box) return false;

  for (let i = 0; i < 8; i++) {
    const btns = Array.from(box.querySelectorAll('button'));
    const arrowBtn =
      btns.find((b) => {
        const t = (b.textContent || '').trim().toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        return t === 'arrow_forward' || aria.includes('generate') || aria.includes('create') || aria.includes('submit');
      }) || btns[btns.length - 1];

    if (arrowBtn && !arrowBtn.disabled && arrowBtn.getAttribute('aria-disabled') !== 'true') {
      arrowBtn.focus();
      arrowBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      arrowBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      arrowBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      arrowBtn.click();
      showNotification('🚀 2 VIDEO (9:16, FRAMES) SEDANG DI-GENERATE DI GOOGLE FLOW!', '#10b981');
      console.log('[AI Video Bridge] Tombol panah putih (->) berhasil diklik!');
      return true;
    }
    await sleep(400);
  }
  return false;
}

// Helper pencari elemen menembus Shadow DOM (Flow Web Components)
function querySelectorAllDeep(selector, root = document) {
  const results = Array.from(root.querySelectorAll(selector));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.shadowRoot) {
      results.push(...querySelectorAllDeep(selector, node.shadowRoot));
    }
  }
  return results;
}

// Cari tombol Download langsung (⤓) di panel detail sebelah kanan jika panel aktif
function findDirectDownloadButton() {
  const allBtns = querySelectorAllDeep('button, [role="button"], a');
  for (const b of allBtns) {
    const t = (b.textContent || '').trim().toLowerCase();
    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
    const title = (b.getAttribute('title') || '').toLowerCase();
    if (t === 'download' || aria.includes('download') || title.includes('download') || aria.includes('unduh') || title.includes('unduh')) {
      const r = b.getBoundingClientRect();
      if (r.width > 12 && r.height > 12 && r.top > 0) return b;
    }
  }
  for (const b of allBtns) {
    const svg = b.querySelector('svg');
    if (svg) {
      const paths = Array.from(svg.querySelectorAll('path')).map((p) => p.getAttribute('d') || '');
      const isDl = paths.some((d) => d.includes('M5 20') || d.includes('v-2h14v2') || d.includes('19H5v-2h14v2z') || d.includes('M19 9h-4V3H9v6H5l7 7 7-7') || d.includes('M12 16l-5-5'));
      if (isDl) {
        const r = b.getBoundingClientRect();
        if (r.width > 12 && r.height > 12 && r.top > 0) return b;
      }
    }
  }
  return null;
}

function find720pMenuItem() {
  const subs = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], li, button, div, span')).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 20 && r.height > 14 && r.height < 90;
  });
  return subs.find((el) => {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return /720p|original size/i.test(t) && !/1080p|4k|upscaled|credit|gif|270p/i.test(t) && t.length < 40;
  });
}

// v3.1: ringkasan semua elemen kartu/video di halaman
function videoDiag() {
  const vids = querySelectorAllDeep('video');
  const cards = getCompletedVideoEntries();
  const directDl = Boolean(findDirectDownloadButton());
  return `Video: ${vids.length}, Kartu Jadi: ${cards.length}, Tombol Download: ${directDl ? 'Ada' : 'Belum'}`;
}

// 5. Cari semua kartu video yang sudah selesai di-render di canvas Google Flow
function getCompletedVideoEntries() {
  const entries = [];
  // 1. Cek semua elemen <video> (termasuk di dalam shadow root)
  const vids = querySelectorAllDeep('video');
  for (const v of vids) {
    const src = v.currentSrc || v.src || (v.querySelector('source') && v.querySelector('source').src) || '';
    const r = v.getBoundingClientRect();
    if (r.width < 50 || r.height < 50) continue;
    let card = v.parentElement;
    while (card && card !== document.body) {
      const cr = card.getBoundingClientRect();
      const btns = card.querySelectorAll('button, [role="button"]');
      if (btns.length >= 2 && cr.width >= r.width && cr.width <= r.width + 150) {
        break;
      }
      card = card.parentElement;
    }
    const cardEl = card && card !== document.body ? card : v.parentElement;
    entries.push({
      video: v,
      card: cardEl,
      cardText: (cardEl ? cardEl.textContent : '') || '',
      src: src || `rect_${Math.round(r.top)}_${Math.round(r.left)}`,
      rect: r,
    });
  }
  if (entries.length > 0) return entries;

  // 2. Jika <video> tag belum terpasang di DOM (Flow memakai canvas/preview card), cari kartu hasil via tombol titik 3 (⋮)
  const allBtns = querySelectorAllDeep('button, [role="button"]');
  const moreBtns = allBtns.filter((b) => {
    const t = (b.textContent || '').trim().toLowerCase();
    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
    const isMore = t === 'more_vert' || t === 'more_horiz' || t.includes('⋮') || aria.includes('more') || aria.includes('option') || aria.includes('options') || aria.includes('menu');
    const r = b.getBoundingClientRect();
    return isMore && r.width > 12 && r.height > 12 && r.top > 50;
  });

  const seenCards = new Set();
  for (const btn of moreBtns) {
    let p = btn.parentElement;
    while (p && p !== document.body) {
      const r = p.getBoundingClientRect();
      if (r.width >= 100 && r.width <= 600 && r.height >= 160 && r.height <= 950) {
        if (!seenCards.has(p)) {
          seenCards.add(p);
          entries.push({
            video: p.querySelector('video') || null,
            card: p,
            cardText: p.textContent || '',
            src: `card_${Math.round(r.top)}_${Math.round(r.left)}`,
            rect: r,
            moreBtn: btn,
          });
        }
        break;
      }
      p = p.parentElement;
    }
  }

  // 3. Cadangan: Jika panel rincian di kanan sudah terbuka dan ada tombol download (⤓)
  const dlBtn = findDirectDownloadButton();
  if (dlBtn && entries.length === 0) {
    const r = dlBtn.getBoundingClientRect();
    entries.push({
      video: null,
      card: dlBtn.closest('div, section') || document.body,
      cardText: 'Details Panel Video',
      src: `panel_${Math.round(r.top)}_${Math.round(r.left)}`,
      rect: r,
      directDlBtn: dlBtn,
    });
  }

  return entries;
}

// Evaluasi cepat kandidat video
async function scoreVideoCandidateFast(entry) {
  const v = entry.video;
  if (!v) return 85; // Kartu terdeteksi tapi belum mount <video> -> tetap diprioritaskan
  let score = 100;
  try {
    // Pastikan metadata video termuat
    if (v.readyState < 1) {
      await Promise.race([
        new Promise((res) => v.addEventListener('loadeddata', res, { once: true })),
        sleep(800),
      ]);
    }
    const dur = v.duration || 8;
    if (dur < 3 || dur > 15) score -= 30;

    // Cek kestabilan visual (tidak ada transisi aneh / layar gelap / glitch mendadak) via mini canvas 32x32
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const captureFrameHist = async (timeSec) => {
      try {
        v.currentTime = Math.min(Math.max(0.2, timeSec), Math.max(0.5, dur - 0.2));
        await sleep(140);
        ctx.drawImage(v, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        let sumBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          sumBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        return { avgBrightness: sumBrightness / (32 * 32), raw: data };
      } catch {
        return null;
      }
    };

    const f1 = await captureFrameHist(0.4);
    const f2 = await captureFrameHist(dur * 0.5);
    const f3 = await captureFrameHist(dur * 0.85);

    if (f1 && f2 && f3) {
      // Penalti jika frame terlalu gelap/hitam (glitch fade out)
      if (f1.avgBrightness < 15 || f2.avgBrightness < 15 || f3.avgBrightness < 15) {
        score -= 40;
      }
      // Hitung selisih perubahan ekstrem antar frame (indikasi transisi aneh / cut pindah ruangan/muka hilang)
      let diff12 = 0;
      let diff23 = 0;
      for (let i = 0; i < f1.raw.length; i += 4) {
        diff12 += Math.abs(f1.raw[i] - f2.raw[i]) + Math.abs(f1.raw[i + 1] - f2.raw[i + 1]);
        diff23 += Math.abs(f2.raw[i] - f3.raw[i]) + Math.abs(f2.raw[i + 1] - f3.raw[i + 1]);
      }
      diff12 /= 32 * 32 * 2;
      diff23 /= 32 * 32 * 2;

      // Semakin stabil frame (tidak ada jump-cut aneh), skor semakin tinggi
      const jumpPenalty = Math.max(0, diff12 - 35) + Math.max(0, diff23 - 35);
      score -= jumpPenalty * 0.8;

      // Penalti jika video membeku (0 gerakan sama sekali)
      if (diff12 < 1.2 && diff23 < 1.2) score -= 25;
    }
    v.currentTime = 0;
  } catch (e) {}
  return score;
}

// v2.8: identitas video yang STABIL + bukti nyata ada video BARU.
// Bug sebelumnya: video dianggap "baru" bila alamatnya (src) tak ada di daftar sebelum Generate. Kalau Flow merender ulang kartu lama
// (alamat/token berubah) video lama (mis. Hook) ikut dianggap hasil baru dan diunduh sebagai CTA padahal CTA belum selesai dibuat.
const _downloadedKeys = new Set(); // video yang sudah diunduh di sesi ini (mis. Hook) tidak boleh terpilih lagi
const normSrc = (s) => { try { const u = new URL(s); return u.origin + u.pathname; } catch { return String(s || ''); } }; // buang query/token
function captureVideoBaseline() {
  const es = getCompletedVideoEntries();
  return { count: es.length, keys: es.map((e) => normSrc(e.src)) };
}
function rememberDownloaded(entry) { if (entry && entry.src) _downloadedKeys.add(normSrc(entry.src)); }
// Kandidat BARU: alamatnya belum pernah ada DAN jumlah video selesai di layar bertambah (hasil Flow menumpuk; layar kosong = semua baru).
// Alamat berubah tapi jumlah tetap = video lama yang dirender ulang, BUKAN hasil generate baru -> tetap menunggu.
function pickFreshEntries(allNow, baseline) {
  const baseKeys = new Set(baseline.keys);
  const unseen = allNow.filter((e) => !baseKeys.has(normSrc(e.src)) && !_downloadedKeys.has(normSrc(e.src)));
  if (!unseen.length) return [];
  const grew = allNow.length > baseline.count;
  if (!(grew || baseline.count === 0)) return [];
  const need = grew ? Math.min(2, allNow.length - baseline.count) : Math.min(2, unseen.length);
  return unseen.slice().sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left).slice(0, Math.max(1, need));
}

// v2.9: tanya dashboard apakah video yang barusan diunduh COCOK dengan naskah slot ini ('ok' | 'reject' | 'unknown' bila tak ada jawaban).
async function verifyDownloadWithDashboard(deliverableId, slot, sinceMs) {
  if (!deliverableId) return 'unknown';
  reportFlow('generating', `Download ${slot.toUpperCase()} dipicu. Dashboard memeriksa apakah isi videonya cocok dengan naskah...`);
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    try {
      const r = await fetch(`http://localhost:3210/api/flow-verdict?deliverableId=${encodeURIComponent(deliverableId)}&slot=${encodeURIComponent(slot)}&since=${sinceMs}`);
      const j = await r.json();
      if (j && (j.verdict === 'ok' || j.verdict === 'reject')) return j.verdict;
    } catch (e) {}
    await sleep(2500);
  }
  return 'unknown';
}

// Memantau hasil generate secara responsif: begitu video selesai, LANGSUNG download!
async function waitAndAutoSelectBestVideo720p(wstate, myRunId) {
  showNotification('⚡ Rafi memantau hasil generate... Begitu video selesai, LANGSUNG didownload!', '#8b5cf6');
  const startWait = Date.now();
  const baselineCount = (wstate && wstate.baseline && wstate.baseline.count) || 0;
  let lastReport = 0;

  while (Date.now() - startWait < 600000) {
    if (myRunId && myRunId !== _runId) return null;

    // 1. Cek tombol download langsung (⤓) di panel rincian sebelah kanan jika panel sedang aktif
    const directDl = findDirectDownloadButton();
    if (directDl) {
      showNotification('🚀 Video siap di panel detail! Menekan tombol Download (⤓)...', '#10b981');
      directDl.click();
      await sleep(350);
      const sub720 = find720pMenuItem();
      if (sub720) {
        sub720.click();
        await sleep(400);
      }
      if (await waitDownloadStarted(Date.now() - 1000, 8000)) {
        showNotification('✅ Download 720p berhasil dipicu!', '#10b981');
        return true;
      }
    }

    // 2. Cek semua video & kartu video di layar secara instan
    const allEntries = getCompletedVideoEntries();
    // Jika jumlah kartu bertambah ATAU setelah 12 detik sudah ada kartu di layar:
    if (allEntries.length > baselineCount || (allEntries.length > 0 && Date.now() - startWait >= 10000)) {
      showNotification(`⚡ Terdeteksi ${allEntries.length} video di layar! Langsung memilih & download 720p...`, '#10b981');
      reportFlow('generating', `Video baru terdeteksi (${allEntries.length} kandidat). Menilai & mengunduh...`);
      const dl = await pickBestAndDownload720p(allEntries);
      if (dl) return dl;
    }

    const waited = Math.round((Date.now() - startWait) / 1000);
    if (Date.now() - lastReport > 20000) {
      lastReport = Date.now();
      const pct = getUploadProgressText();
      const msg = `Menunggu video selesai dibuat... ${waited} dtk${pct ? ` (${pct})` : ''}. [${videoDiag()}]`;
      showNotification('⏳ ' + msg, '#8b5cf6');
      reportFlow('generating', msg);
    }
    await sleep(1000); // responsif cek tiap 1 detik!
  }
  return null;
}

// Bisa dipanggil kapan saja untuk langsung menilai video yang sudah ada di layar sekarang & download 720p!
async function evaluateAndDownloadBestVideoNow(targetSlot = '') {
  // 1. Cek tombol download langsung jika ada panel detail terbuka
  const directDl = findDirectDownloadButton();
  if (directDl) {
    showNotification('🚀 Menekan tombol Download langsung di panel rincian...', '#10b981');
    directDl.click();
    await sleep(350);
    const sub720 = find720pMenuItem();
    if (sub720) {
      sub720.click();
      await sleep(400);
    }
    if (await waitDownloadStarted(Date.now() - 1000, 8000)) {
      showNotification('✅ Download 720p berhasil dipicu!', '#10b981');
      return true;
    }
  }

  const allEntries = getCompletedVideoEntries();
  if (allEntries.length === 0) {
    showNotification('⚠️ Belum ada kartu video yang terdeteksi di layar Google Flow! [' + videoDiag() + ']', '#ef4444');
    reportFlow('warn', 'Tidak ada kartu video terdeteksi: ' + videoDiag());
    return false;
  }
  return await pickBestAndDownload720p(allEntries);
}

async function pickBestAndDownload720p(candidates) {
  showNotification(`🔍 Rafi mengecek ${candidates.length} kandidat video (cek kestabilan muka, transisi & suara)...`, '#3b82f6');
  let bestEntry = candidates[0];
  let bestScore = -999;

  for (let i = 0; i < candidates.length; i++) {
    const sc = await scoreVideoCandidateFast(candidates[i]);
    console.log(`[Rafi Evaluator] Kandidat #${i + 1} skor kerapian:`, sc.toFixed(1));
    if (sc > bestScore) {
      bestScore = sc;
      bestEntry = candidates[i];
    }
  }

  showNotification(`✅ Kandidat terbaik dipilih (Skor: ${bestScore.toFixed(0)})! Klik titik 3 (⋮) -> Download 720p...`, '#10b981');
  // v2.5: coba kandidat terbaik dulu (2x), lalu kandidat lain; kembalikan true HANYA bila opsi 720p benar-benar diklik
  const order = [bestEntry, ...candidates.filter((c) => c !== bestEntry)];
  for (const cand of order) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (await downloadVideo720p(cand.card, cand.video)) { rememberDownloaded(cand); return cand; }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      await sleep(700);
    }
  }
  return false;
}

// --- v2.7: pastikan download benar-benar mulai + jalur cadangan tanpa klik menu ---
const askBg = (msg) => new Promise((resolve) => {
  try {
    chrome.runtime.sendMessage(msg, (res) => resolve(chrome.runtime.lastError ? null : res));
  } catch (e) { resolve(null); }
});
async function waitDownloadStarted(sinceMs, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const r = await askBg({ action: 'LAST_DOWNLOAD' });
    if (r && r.hasApi && r.last && r.last.at >= sinceMs - 200) return true;
    if (r && !r.hasApi) return true; // izin downloads belum aktif: tidak bisa memastikan, jangan unduh dobel
    await sleep(500);
  }
  return false;
}
// Cadangan: (A) minta Chrome mengunduh alamat videonya langsung, (B) ambil file lewat halaman lalu simpan ke Downloads via dashboard.
// Nama file sengaja "Flow_Rafi_<slot>_<waktu>.mp4" agar dikenali penjaga Downloads di dashboard seperti download biasa.
async function fallbackDownloadVideo(videoEl) {
  const src = videoEl && (videoEl.currentSrc || videoEl.src);
  const dims = videoEl ? `${videoEl.videoWidth}x${videoEl.videoHeight}` : '?';
  const fname = `Flow_Rafi_${_curTask.slot || 'hook'}_${Date.now()}.mp4`;
  if (!src) { reportFlow('error', 'Fallback gagal: alamat video tidak ditemukan.'); return false; }
  if (/^https?:/i.test(src)) {
    const r = await askBg({ action: 'DOWNLOAD_URL', url: src, filename: fname });
    if (r && r.ok) { reportFlow('warn', `Klik 720p tidak memicu download; video diunduh langsung dari sumbernya (${dims}).`); return true; }
    console.warn('[AI Video Bridge] Fallback A gagal:', r && r.error);
  }
  try {
    const resp = await fetch(src);
    const blob = await resp.blob();
    if (blob.size > 50000) {
      const up = await fetch(`http://localhost:3210/api/flow-upload?name=${encodeURIComponent(fname)}`, { method: 'POST', body: blob });
      if (up.ok) { reportFlow('warn', `Video diambil lewat halaman & dikirim ke dashboard (${dims}, ${(blob.size / 1048576).toFixed(1)} MB).`); return true; }
    }
  } catch (e) { console.warn('[AI Video Bridge] Fallback B gagal:', e); }
  reportFlow('error', `Download gagal: klik 720p tidak memicu apa pun dan video tidak bisa diambil langsung (${dims}, sumber: ${String(src).slice(0, 60)}).`);
  return false;
}

// 6. Klik titik tiga (⋮) di pojok kanan atas kartu video -> Download -> 720p (Original size)
async function downloadVideo720p(cardElement, videoElement) {
  try {
    // 0. Prioritas utama: jika panel rincian sebelah kanan aktif dan punya tombol Download (⤓), klik langsung!
    const directDl = findDirectDownloadButton();
    if (directDl) {
      console.log('[AI Video Bridge] Menemukan tombol Download langsung (⤓) di panel detail!');
      directDl.click();
      await sleep(350);
      const sub720 = find720pMenuItem();
      if (sub720) {
        sub720.click();
        await sleep(350);
      }
      const clickedAt = Date.now();
      if (await waitDownloadStarted(clickedAt, 8000)) {
        const isGlobal = _currentStartAvatar && _currentStartAvatar.startsWith('kira_');
        showNotification(`⬇️ Video 720p didownload! Vanya langsung ubah ke Suara ${isGlobal ? 'LIAM (English Tech Creator)' : 'Pak Akbar'}!`, '#10b981');
        return true;
      }
    }

    const card = cardElement || (videoElement && videoElement.parentElement) || document.body;
    const vRect = (videoElement || card).getBoundingClientRect();

    // Hover ke kartu video dulu supaya pill tombol pojok kanan atas (heart, reuse, titik 3) muncul!
    for (const targetEl of [card, videoElement].filter(Boolean)) {
      targetEl.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      targetEl.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      targetEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      targetEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      targetEl.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: vRect.right - 25, clientY: vRect.top + 25 }));
    }
    await sleep(300);

    // Cari tombol titik tiga (⋮) di dalam kartu (atau tombol paling kanan di pill pojok kanan atas kartu)
    let btns = Array.from(card.querySelectorAll('button, [role="button"]')).filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    // Jika tidak ketemu di dalam card node, cari tombol yang posisinya berada di pojok kanan atas area video
    if (btns.length === 0) {
      btns = Array.from(document.querySelectorAll('button, [role="button"]')).filter((b) => {
        const r = b.getBoundingClientRect();
        return (
          r.width > 16 &&
          r.height > 16 &&
          r.top >= vRect.top - 10 &&
          r.top <= vRect.top + 80 &&
          r.right <= vRect.right + 15 &&
          r.left >= vRect.left + vRect.width * 0.4
        );
      });
    }

    let moreBtn = btns.find((b) => {
      const txt = (b.textContent || '').trim().toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return (
        txt === 'more_vert' ||
        txt === 'more_horiz' ||
        txt.includes('⋮') ||
        aria.includes('more') ||
        aria.includes('options') ||
        aria.includes('menu') ||
        aria.includes('lainnya') ||
        aria.includes('opsi')
      );
    });

    // Di UI Google Flow (seperti di screenshot), pill pojok kanan atas punya 3 tombol: [Heart] [Reuse] [Titik 3 (paling kanan)]
    if (!moreBtn && btns.length > 0) {
      const topBtns = btns
        .filter((b) => Math.abs(b.getBoundingClientRect().top - vRect.top) < 85)
        .sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left);
      moreBtn = topBtns[0] || btns[btns.length - 1];
    }

    if (!moreBtn) {
      showNotification('⚠️ Tombol titik 3 (⋮) belum terlihat, mencoba klik koordinat pojok kanan atas video...', '#f59e0b');
      const topRightEl = document.elementFromPoint(vRect.right - 26, vRect.top + 28);
      if (topRightEl) {
        moreBtn = topRightEl.closest('button, [role="button"]') || topRightEl;
      }
    }

    if (moreBtn) {
      moreBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      moreBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      moreBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      moreBtn.click();
      await sleep(380);

      // Cari menu item "Download"
      const menuItems = Array.from(
        document.querySelectorAll('[role="menuitem"], [role="option"], li, button, div[tabindex]')
      ).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });

      // v2.5: pilih elemen PALING SPESIFIK yang teksnya diawali "Download" (dulu .find() bisa mengena pembungkus menu, bukan barisnya)
      const area = (el) => { const r = el.getBoundingClientRect(); return r.width * r.height; };
      const dlItem = menuItems
        .filter((el) => {
          const t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
          const r = el.getBoundingClientRect();
          return (t.startsWith('download') || t.startsWith('unduh')) && r.height < 90 && r.width < 500;
        })
        .sort((a, b) => area(a) - area(b))[0];

      if (dlItem) {
        const ir = dlItem.getBoundingClientRect();
        const cx = ir.left + ir.width / 2, cy = ir.top + ir.height / 2;
        const fire = (el, type, extra = {}) => {
          const init = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, ...extra };
          el.dispatchEvent(type.startsWith('pointer') ? new PointerEvent(type, init) : new MouseEvent(type, init));
        };
        // submenu Material terbuka lewat HOVER / panah kanan, bukan sekadar klik: kirim hover penuh lalu klik, lalu coba panah kanan
        for (const ty of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove']) fire(dlItem, ty);
        dlItem.focus && dlItem.focus();
        fire(dlItem, 'pointerdown'); fire(dlItem, 'mousedown'); fire(dlItem, 'mouseup'); dlItem.click();

        const findOpt = () => {
          const subs = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], li, button, div, span')).filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 20 && r.height > 14 && r.height < 90 && el !== dlItem && !dlItem.contains(el);
          });
          return subs
            .filter((el) => {
              const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
              // PENTING: jangan pernah mengena 1080p/4K ("Upscaled", "50 credits" = memakai kredit) atau 270p (GIF)
              return /720p|original size/i.test(t) && !/1080p|4k|upscaled|credit|gif|270p/i.test(t) && t.length < 40;
            })
            .sort((a, b) => area(a) - area(b))[0];
        };

        let p720 = null;
        const tStart = Date.now();
        let triedKey = false;
        while (Date.now() - tStart < 3500 && !p720) {
          await sleep(250);
          p720 = findOpt();
          if (!p720 && !triedKey && Date.now() - tStart > 800) {
            triedKey = true;
            for (const k of ['ArrowRight', 'Enter']) {
              dlItem.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k, bubbles: true, cancelable: true }));
              dlItem.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: k, bubbles: true, cancelable: true }));
            }
          }
        }

        if (p720) {
          const clickable720 = p720.closest('[role="menuitem"], button, li, div[tabindex]') || p720;
          const pr = clickable720.getBoundingClientRect();
          const pc = { bubbles: true, cancelable: true, view: window, clientX: pr.left + pr.width / 2, clientY: pr.top + pr.height / 2 };
          clickable720.dispatchEvent(new PointerEvent('pointerdown', pc));
          clickable720.dispatchEvent(new MouseEvent('mousedown', pc));
          clickable720.dispatchEvent(new MouseEvent('mouseup', pc));
          const clickedAt = Date.now();
          clickable720.click();
          // v2.7: klik buatan skrip BELUM TENTU memicu download di Flow versi sekarang. Pastikan Chrome benar-benar memulai download.
          showNotification('⏳ Menunggu Chrome memulai download 720p...', '#8b5cf6');
          if (await waitDownloadStarted(clickedAt, 12000)) {
            const isGlobal = _currentStartAvatar && _currentStartAvatar.startsWith('kira_');
            showNotification(`⬇️ Video 720p didownload! Vanya langsung ubah ke Suara ${isGlobal ? 'LIAM (English Tech Creator)' : 'Pak Akbar'}!`, '#10b981');
            return true;
          }
          showNotification('⚠️ Klik 720p tidak memicu download. Mengambil video langsung dari sumbernya...', '#f59e0b');
          return await fallbackDownloadVideo(videoElement);
        }
        // v2.5: TIDAK lagi menganggap "pasti terunduh". Catat apa yang terlihat supaya bisa didiagnosis.
        const seen = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], li, button, span'))
          .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 20 && r.height > 12 && r.height < 90 && r.left > ir.left; })
          .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter((t) => t && t.length < 40);
        const uniq = [...new Set(seen)].slice(0, 12).join(' | ');
        console.warn('[AI Video Bridge] Submenu Download tidak terbuka / opsi 720p tidak ketemu. Terlihat:', uniq);
        reportFlow('warn', `Submenu Download tidak menampilkan 720p. Teks terlihat: ${uniq}`);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
        return false;
      }
    }
  } catch (e) {
    console.warn('[AI Video Bridge] Gagal download 720p:', e);
  }
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function showNotification(msg, color) {
  let notif = document.getElementById('ai-flow-notif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'ai-flow-notif';
    notif.style.position = 'fixed';
    notif.style.top = '16px';
    notif.style.right = '16px';
    notif.style.zIndex = '999999';
    notif.style.padding = '12px 18px';
    notif.style.borderRadius = '10px';
    notif.style.color = '#fff';
    notif.style.fontFamily = 'sans-serif';
    notif.style.fontSize = '13px';
    notif.style.fontWeight = 'bold';
    notif.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    notif.style.transition = 'opacity 0.3s ease';
    document.body.appendChild(notif);
  }
  notif.style.background = color || '#3b82f6';
  notif.textContent = msg;
  notif.style.opacity = '1';
  clearTimeout(window._notifTimer);
  window._notifTimer = setTimeout(() => {
    if (notif) notif.style.opacity = '0';
  }, 5000);
}
