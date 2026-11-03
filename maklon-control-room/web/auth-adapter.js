/*
 * auth-adapter.js
 * Menyediakan window.claude.use("db" | "user" | "sample") di atas Firebase,
 * supaya app (index.html) jalan di hosting sendiri tanpa diubah.
 *   db     -> Firestore (API compat: collection/doc/add/set/update/delete/onSnapshot/orderBy/limit)
 *   user   -> Firebase Auth + koleksi "users" untuk nama tampilan
 *   sample -> Cloud Function "ai" (Anthropic API dipanggil dari server, API key tidak pernah di browser)
 * Halaman login ditampilkan sampai user masuk.
 */
(function () {
  'use strict';
  const CFG = window.MAKLON_CONFIG || {};
  firebase.initializeApp(CFG.firebase);
  const auth = firebase.auth();
  const fs = firebase.firestore();
  const owners = (CFG.ownerEmails || []).map(e => String(e).toLowerCase());

  // ---------- halaman login ----------
  const css = `
  body.mk-locked #app{display:none}
  .mk-login{min-height:100vh;display:grid;place-items:center;padding:24px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px));background:var(--bg)}
  .mk-login .box{width:min(400px,100%);background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:28px 24px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--shadow)}
  .mk-login h1{font-size:20px;margin:0}
  .mk-login p{margin:0;color:var(--muted);font-size:13px}
  .mk-login .or{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12px}
  .mk-login .or::before,.mk-login .or::after{content:"";flex:1;border-top:1px solid var(--line)}
  .mk-login .links{display:flex;justify-content:space-between;gap:8px;font-size:12.5px}
  .mk-login .links button{background:none;border:0;color:var(--accent);cursor:pointer;padding:0;font-weight:600}
  .mk-login .msg-ok{color:var(--ok);font-size:12.5px}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  let mode = 'login';
  const resolveLoginId = (val) => {
    let s = String(val || '').trim();
    if (!s) return '';
    if (s.includes('@')) return s.toLowerCase();
    return `${s.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@haraka.com`;
  };

  function loginHTML(err, info) {
    const reg = mode === 'register', reset = mode === 'reset';
    return `<div class="box" role="form" aria-label="Masuk">
      <div><h1>${reset ? 'Atur ulang password' : reg ? 'Buat akun' : 'Masuk'}</h1><p>Maklon Control Room · Haraka Erfi</p></div>
      ${reg ? `<div class="fld"><label for="mkName">Nama & bagian</label><input id="mkName" autocomplete="name" placeholder="mis. Nurul – CS"></div>` : ''}
      <div class="fld"><label for="mkEmail">Username atau Email</label><input id="mkEmail" type="text" autocomplete="username" placeholder="mis. admin atau nurul" autocapitalize="none"></div>
      ${reset ? '' : `<div class="fld"><label for="mkPass">Password</label><input id="mkPass" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" minlength="6"></div>`}
      ${err ? `<div class="err" role="alert">${err}</div>` : ''}${info ? `<div class="msg-ok" role="status">${info}</div>` : ''}
      <button class="btn pri" id="mkGo">${reset ? 'Kirim link reset' : reg ? 'Buat akun' : 'Masuk'}</button>
      ${!reset && CFG.googleLogin ? `<div class="or">atau</div><button class="btn" id="mkGoogle">Masuk dengan Google</button>` : ''}
      <div class="links">
        ${mode !== 'login' ? `<button data-mk="login">Kembali ke masuk</button>` : `<button data-mk="reset">Lupa password?</button>`}
        ${mode === 'login' && CFG.allowRegister ? `<button data-mk="register">Buat akun baru</button>` : ''}
      </div>
      <p>Akun baru perlu disetujui pemilik sebelum bisa melihat data.</p></div>`;
  }
  let host = null;
  function showLogin(err = '', info = '') {
    document.body.classList.add('mk-locked');
    if (!host) { host = document.createElement('div'); host.className = 'mk-login'; document.body.prepend(host); }
    host.innerHTML = loginHTML(err, info);
    host.querySelector('#mkEmail')?.focus();
  }
  function hideLogin() { document.body.classList.remove('mk-locked'); if (host) { host.remove(); host = null; } }
  const errText = e => ({
    'auth/invalid-credential': 'Username/email atau password salah.', 'auth/wrong-password': 'Username/email atau password salah.', 'auth/user-not-found': 'Akun tidak ditemukan.',
    'auth/email-already-in-use': 'Username/email sudah terdaftar. Silakan masuk.', 'auth/weak-password': 'Password minimal 6 karakter.', 'auth/invalid-email': 'Format username/email tidak valid.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.', 'auth/popup-closed-by-user': 'Login Google dibatalkan.'
  }[e?.code] || 'Gagal masuk. Coba lagi.');

  document.addEventListener('click', async e => {
    if (!host || !host.contains(e.target)) return;
    const sw = e.target.closest('[data-mk]'); if (sw) { mode = sw.dataset.mk; showLogin(); return; }
    const rawInput = host.querySelector('#mkEmail')?.value.trim();
    const email = resolveLoginId(rawInput), pass = host.querySelector('#mkPass')?.value || '';
    try {
      if (e.target.id === 'mkGoogle') { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); return; }
      if (e.target.id !== 'mkGo') return;
      e.target.disabled = true;
      if (mode === 'reset') { await auth.sendPasswordResetEmail(email); mode = 'login'; showLogin('', 'Link reset password sudah dikirim ke email.'); return; }
      if (mode === 'register') {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        const name = host?.querySelector('#mkName')?.value.trim();
        if (name) await cred.user.updateProfile({ displayName: name });
        return;
      }
      await auth.signInWithEmailAndPassword(email, pass);
    } catch (err) { showLogin(errText(err)); }
  });
  document.addEventListener('keydown', e => { if (host && e.key === 'Enter' && host.contains(e.target)) host.querySelector('#mkGo')?.click(); });

  // ---------- tunggu login ----------
  let resolveReady; const ready = new Promise(r => resolveReady = r);
  let signedInOnce = false;
  auth.onAuthStateChanged(async u => {
    if (!u) { if (signedInOnce) location.reload(); else showLogin(); return; }
    if (signedInOnce) return;
    signedInOnce = true; hideLogin();
    try { await fs.collection('users').doc(u.uid).set({ name: u.displayName || u.email, email: (u.email || '').toLowerCase(), lastLogin: new Date().toISOString() }, { merge: true }); } catch (e) {}
    resolveReady(u);
  });
  window.maklonLogout = () => auth.signOut();

  // ---------- capability: user ----------
  const nameCache = {};
  const userCap = {
    id: async () => auth.currentUser?.uid || null,
    isOwner: async () => owners.includes((auth.currentUser?.email || '').toLowerCase()),
    canEdit: async () => owners.includes((auth.currentUser?.email || '').toLowerCase()),
    can: async () => null,
    me: async () => ({ id: auth.currentUser?.uid || null, name: auth.currentUser?.displayName || auth.currentUser?.email || '', email: auth.currentUser?.email || null }),
    profiles: async ids => {
      ids = [...new Set([].concat(ids))];
      await Promise.all(ids.filter(i => i && !(i in nameCache)).map(async i => {
        try { const d = await fs.collection('users').doc(i).get(); nameCache[i] = d.exists ? (d.data().name || d.data().email || '') : ''; } catch (e) { nameCache[i] = ''; }
      }));
      return Object.fromEntries(ids.map(i => [i, { id: i, name: nameCache[i] || '' }]));
    }
  };

  // ---------- capability: sample (AI) ----------
  async function sample(input, opts = {}) {
    if (!CFG.aiEndpoint) throw { code: 'not_granted', message: 'AI belum diaktifkan' };
    const token = await auth.currentUser.getIdToken();
    const prompt = typeof input === 'string' ? input : input.map(m => `${m.role}: ${m.content}`).join('\n\n');
    const r = await fetch(CFG.aiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ prompt }), signal: opts.signal });
    if (r.status === 429) throw { code: 'rate_limited', message: 'AI sibuk' };
    if (!r.ok) throw { code: 'unavailable', message: 'AI gagal' };
    const j = await r.json();
    return { text: j.text || '', truncated: false };
  }

  window.claude = {
    use: async name => {
      await ready;
      if (name === 'db') return fs;
      if (name === 'user') return userCap;
      if (name === 'sample') return CFG.aiEndpoint ? sample : null;
      return null;
    }
  };
})();
