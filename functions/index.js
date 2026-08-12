/* ══════════════════════════════════════════════════════════════
   EZ-HADIR — peringatan harian melalui Cloud Functions + FCM

   Dua jadual sahaja, kedua-duanya dalam kuota percuma:
     peringatanPagi   — 07:30, ingatkan semua guru merekod kehadiran
     semakanTengahari — 10:30, beritahu admin kelas yang belum lapor

   Kos: Cloud Scheduler percuma sehingga 3 jadual sebulan.
        Cloud Functions percuma sehingga 2 juta panggilan sebulan.
        Dua jadual × ~22 hari = ~44 panggilan sebulan.
   ══════════════════════════════════════════════════════════════ */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/* Tetapan jimat kos: rantau berdekatan, memori minimum,
   tiada instance sentiasa hidup, had instance rendah. */
setGlobalOptions({
  region: 'asia-southeast1',
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 2,
  timeoutSeconds: 120
});

const ZON = 'Asia/Kuala_Lumpur';

/* ── pembantu ───────────────────────────────────────────────── */
function hariKerja() {
  const h = new Date(new Date().toLocaleString('en-US', { timeZone: ZON })).getDay();
  return h !== 0 && h !== 6;              // langkau Sabtu dan Ahad
}

function tarikhHariIni() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: ZON }));
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function sekolahAktif() {
  const snap = await db.collection('sekolah').get();
  const kini = admin.firestore.Timestamp.now();
  return snap.docs.filter(d => {
    const v = d.data();
    if (v.aktif === false) return false;
    if (v.tamat && v.tamat.toMillis() < kini.toMillis()) return false;
    return true;
  });
}

/* Hantar dalam kelompok 500, buang token yang sudah mati */
async function hantar(sid, tokenDocs, title, body, tag) {
  if (!tokenDocs.length) return 0;
  let berjaya = 0;
  for (let i = 0; i < tokenDocs.length; i += 500) {
    const kumpulan = tokenDocs.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: kumpulan.map(d => d.data().token),
      data: { title, body, tag, url: `./?s=${sid}` },
      webpush: {
        headers: { Urgency: 'normal', TTL: '10800' },
        fcmOptions: { link: `./?s=${sid}` }
      }
    });
    berjaya += res.successCount;

    const buang = [];
    res.responses.forEach((r, j) => {
      const kod = r.error?.code || '';
      if (!r.success && (kod.includes('registration-token-not-registered') ||
                         kod.includes('invalid-argument'))) {
        buang.push(kumpulan[j].ref.delete());
      }
    });
    if (buang.length) await Promise.allSettled(buang);
  }
  return berjaya;
}

/* ── 07:30 — ingatkan semua guru ────────────────────────────── */
exports.peringatanPagi = onSchedule(
  { schedule: '30 7 * * 1-5', timeZone: ZON },
  async () => {
    if (!hariKerja()) return;
    for (const sekolah of await sekolahAktif()) {
      const tokens = await db.collection('sekolah').doc(sekolah.id).collection('token').get();
      const n = await hantar(
        sekolah.id, tokens.docs,
        'EZ-HADIR',
        'Selamat pagi. Masa untuk merekod kehadiran kelas hari ini.',
        'ez-pagi'
      );
      console.log(`${sekolah.id}: peringatan pagi kepada ${n} peranti`);
    }
  }
);

/* ── 10:30 — beritahu admin kelas yang belum lapor ──────────── */
exports.semakanTengahari = onSchedule(
  { schedule: '30 10 * * 1-5', timeZone: ZON },
  async () => {
    if (!hariKerja()) return;
    const hariIni = tarikhHariIni();

    for (const sekolah of await sekolahAktif()) {
      const rujuk = db.collection('sekolah').doc(sekolah.id);

      const [kelasSnap, rekodSnap] = await Promise.all([
        rujuk.collection('kelas').get(),
        rujuk.collection('rekod').where('tarikh', '==', hariIni).get()
      ]);
      if (kelasSnap.empty) continue;

      const sudah = new Set(rekodSnap.docs.map(d => d.data().kelas));
      const belum = kelasSnap.docs.map(d => d.data().nama).filter(n => n && !sudah.has(n));
      if (!belum.length) continue;

      // hanya admin menerima semakan ini
      const tokens = await rujuk.collection('token').where('peranan', 'in', ['admin', 'pemilik']).get();
      const senarai = belum.slice(0, 5).join(', ') + (belum.length > 5 ? ` dan ${belum.length - 5} lagi` : '');
      const n = await hantar(
        sekolah.id, tokens.docs,
        'Kelas belum lapor',
        `${belum.length} kelas belum hantar kehadiran: ${senarai}`,
        'ez-semak'
      );
      console.log(`${sekolah.id}: ${belum.length} kelas belum lapor, ${n} admin dimaklumkan`);
    }
  }
);
