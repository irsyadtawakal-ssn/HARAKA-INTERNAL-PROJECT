/**
 * Impor data 2026 (pelanggan, invoice, kontak WA, pengaturan) ke Firestore.
 * Cara pakai:
 *   1. Firebase Console → Project settings → Service accounts → Generate new private key
 *      simpan sebagai scripts/service-account.json (JANGAN di-commit / dibagikan)
 *   2. cd scripts && npm init -y && npm i firebase-admin
 *   3. node import-data.js
 * Aman dijalankan ulang: dokumen dengan id yang sama akan ditimpa, bukan diduplikasi.
 */
let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  admin = require('../server/node_modules/firebase-admin');
}
const path = require('path');
admin.initializeApp({ credential: admin.credential.cert(require('./service-account.json')) });
const db = admin.firestore();

async function load(col, file) {
  const data = require(path.join(__dirname, '..', 'data', file));
  const entries = Object.entries(data);
  for (let i = 0; i < entries.length; i += 400) {
    const batch = db.batch();
    for (const [id, doc] of entries.slice(i, i + 400)) batch.set(db.collection(col).doc(id), doc);
    await batch.commit();
  }
  console.log(`${col}: ${entries.length} dokumen`);
}

(async () => {
  await load('customers', 'customers.json');
  await load('payments', 'payments.json');
  await load('leads', 'leads.json');
  await load('meta', 'meta.json');
  console.log('Selesai.');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
