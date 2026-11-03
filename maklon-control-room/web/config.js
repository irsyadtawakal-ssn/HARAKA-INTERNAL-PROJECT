// ============================================================
//  KONFIGURASI — isi bagian ini sebelum dipasang
// ============================================================
window.MAKLON_CONFIG = {
  // Firebase Console → Project settings → Your apps → Web app → SDK config
  firebase: {
    apiKey: "AIzaSyBqwxc275SjeZJXqnQYBr9ayoJQw6tO8zU",
    authDomain: "haraka-b286a.firebaseapp.com",
    projectId: "haraka-b286a",
    storageBucket: "haraka-b286a.firebasestorage.app",
    messagingSenderId: "43771242626",
    appId: "1:43771242626:web:fcfc17554c15549b746c9b"
  },

  // Email pemilik. Pemilik otomatis jadi Admin dan bisa mengatur peran tim.
  // HARUS sama dengan daftar di firestore.rules (fungsi isOwner).
  ownerEmails: ["creatormpb25@gmail.com", "admin@haraka.com"],

  // URL Cloud Function "ai" setelah deploy, atau "/api/ai" jika deploy di VPS.
  // Kosongkan untuk mematikan fitur AI (sistem tetap jalan memakai pesan template).
  // - Di VPS: gunakan "/api/ai"
  // - Di Firebase Cloud Functions: "https://asia-southeast2-ISI_PROJECT_ID.cloudfunctions.net/ai"
  aiEndpoint: "/api/ai",

  // Tampilkan tombol "Masuk dengan Google" di halaman login
  googleLogin: true,

  // Izinkan orang membuat akun sendiri dari halaman login.
  // Akun baru tetap tidak bisa melihat apa pun sampai pemilik memberi peran.
  allowRegister: true
};
