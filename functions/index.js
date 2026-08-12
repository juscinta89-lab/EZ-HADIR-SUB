/* ══════════════════════════════════════════════════════════════
   EZ-HADIR — peringatan harian melalui Cloud Functions + FCM

   SATU jadual sahaja. Ia bangun setiap jam antara 6 pagi hingga
   1 petang (Isnin–Jumaat), kemudian menyemak tetapan setiap
   sekolah untuk menentukan siapa perlu dihubungi pada jam itu.

   Setiap sekolah menetapkan waktunya sendiri melalui app:
     Tetapan admin → Telegram → Waktu peringatan
   Disimpan di: sekolah/{sid}/tetapan/peringatan
                { jamPagi: 7, jamSemak: 10, aktif: true }

   Kos: Cloud Scheduler percuma sehingga 3 jadual (kita guna 1).
        Cloud Functions percuma sehingga 2 juta panggilan sebulan
        (kita guna lebih kurang 176).
   ══════════════════════════════════════════════════════════════ */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({
  region: 'asia-southeast1',
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 2,
  timeoutSeconds: 180
});

const ZON = 'Asia/Kuala_Lumpur';
const kiniMY = () => new Date(new Date().toLocaleString('en-US', { timeZone: ZON }));

function tarikhHariIni() {
  const d = kiniMY();
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

async function ingatanGuru(rujuk, sid) {
  const tokens = await rujuk.collection('token').get();
  const n = await hantar(sid, tokens.docs, 'EZ-HADIR',
    'Selamat pagi. Masa untuk merekod kehadiran kelas hari ini.', 'ez-pagi');
  console.log(`${sid}: ingatan pagi kepada ${n} peranti`);
}

async function semakanAdmin(rujuk, sid) {
  const hariIni = tarikhHariIni();
  const [kelasSnap, rekodSnap] = await Promise.all([
    rujuk.collection('kelas').get(),
    rujuk.collection('rekod').where('tarikh', '==', hariIni).get()
  ]);
  if (kelasSnap.empty) return;

  const sudah = new Set(rekodSnap.docs.map(d => d.data().kelas));
  const belum = kelasSnap.docs.map(d => d.data().nama).filter(n => n && !sudah.has(n));
  if (!belum.length) {
    console.log(`${sid}: semua kelas sudah lapor`);
    return;
  }

  const tokens = await rujuk.collection('token')
    .where('peranan', 'in', ['admin', 'pemilik']).get();
  const senarai = belum.slice(0, 5).join(', ') +
    (belum.length > 5 ? ` dan ${belum.length - 5} lagi` : '');
  const n = await hantar(sid, tokens.docs, 'Kelas belum lapor',
    `${belum.length} kelas belum hantar kehadiran: ${senarai}`, 'ez-semak');
  console.log(`${sid}: ${belum.length} kelas belum lapor, ${n} admin dimaklumkan`);
}

/* ── ujian: hantar notifikasi serta-merta kepada pemanggil ──── */
exports.ujiNotifikasi = onCall(async (req) => {
  const emel = (req.auth?.token?.email || '').toLowerCase();
  if (!emel) throw new HttpsError('unauthenticated', 'Perlu log masuk.');

  const sid = String(req.data?.sid || '').trim();
  if (!sid) throw new HttpsError('invalid-argument', 'sid diperlukan.');

  // hanya token milik pemanggil sendiri
  const tokens = await db.collection('sekolah').doc(sid)
    .collection('token').where('emel', '==', emel).get();
  if (tokens.empty) return { dihantar: 0, nota: 'Tiada peranti berdaftar.' };

  const n = await hantar(sid, tokens.docs, 'EZ-HADIR',
    'Notifikasi ujian berjaya. Peringatan harian anda sudah berfungsi.', 'ez-uji');
  console.log(`Ujian oleh ${emel} di ${sid}: ${n} peranti`);
  return { dihantar: n };
});

/* ── satu jadual, bangun setiap jam 6 pagi hingga 1 petang ──── */
exports.peringatanHarian = onSchedule(
  { schedule: '30 6-13 * * 1-5', timeZone: ZON },
  async () => {
    const jam = kiniMY().getHours();
    console.log(`Semakan pada jam ${jam}:30 waktu Malaysia`);

    for (const sekolah of await sekolahAktif()) {
      const sid = sekolah.id;
      const rujuk = db.collection('sekolah').doc(sid);

      let t = { jamPagi: 7, jamSemak: 10, aktif: true };
      try {
        const d = await rujuk.collection('tetapan').doc('peringatan').get();
        if (d.exists) t = { ...t, ...d.data() };
      } catch (e) { /* guna nilai lalai */ }

      if (t.aktif === false) continue;

      try {
        if (jam === Number(t.jamPagi))  await ingatanGuru(rujuk, sid);
        if (jam === Number(t.jamSemak)) await semakanAdmin(rujuk, sid);
      } catch (e) {
        console.error(`${sid}: ralat`, e);
      }
    }
  }
);
