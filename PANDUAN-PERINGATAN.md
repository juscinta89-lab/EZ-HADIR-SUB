# EZ-HADIR — Pasang Peringatan Harian (Cloud Functions + FCM)

Selepas ini, notifikasi sampai ke telefon guru **walaupun app ditutup**.

Anggaran kos: **RM0 hingga RM0.50 sebulan.** Butiran di Bahagian F.

---

## A. Dapatkan kunci VAPID

1. Firebase Console → ⚙️ **Project settings** → tab **Cloud Messaging**
2. Bahagian **Web Push certificates** → **Generate key pair**
3. Salin kunci yang panjang itu (bermula `B...`)
4. Buka `index.html`, cari `VAPID: ""`, tampal di dalam petikan:

```js
VAPID: "BEl3xK...kunci-anda",
```

---

## B. Semak fail firebase-messaging-sw.js

Fail ini sudah diisi dengan tetapan projek `ez-hadir-subscribe`. Jika anda tukar projek Firebase nanti, tetapan di dalamnya perlu ditukar sekali.

Fail mesti berada di **root yang sama** dengan `index.html`. Jangan letak dalam subfolder.

---

## C. Pasang Cloud Functions

Di komputer, perlukan Node.js. Buka Terminal:

```bash
npm install -g firebase-tools
firebase login
cd folder-ez-hadir
firebase use ez-hadir-subscribe
cd functions && npm install && cd ..
firebase deploy --only functions
```

Kali pertama, Firebase akan minta anda aktifkan beberapa API (Cloud Build, Artifact Registry, Cloud Scheduler). Tekan **Yes** untuk semua.

Selepas siap, **satu** jadual muncul di Google Cloud Console → Cloud Scheduler:
`peringatanHarian`, berjalan setiap jam antara 6:30 pagi hingga 1:30 petang, Isnin–Jumaat.

Jadual itu bangun setiap jam, kemudian menyemak tetapan setiap sekolah untuk
menentukan siapa perlu dihubungi pada jam tersebut. Jadi **waktu ditetapkan
dari dalam app, bukan dalam kod**.

---

## C2. Menukar waktu peringatan

Admin sekolah: **Menu → Tetapan admin → Telegram → Waktu peringatan**

| Medan | Maksud |
|---|---|
| Ingatan guru | Semua guru diingatkan merekod kehadiran |
| Semakan admin | Admin menerima senarai kelas yang belum lapor |
| Hidupkan peringatan | Matikan semua notifikasi untuk sekolah ini |

Pilihan 6:30 pagi hingga 1:30 petang. Semakan admin mesti lebih lewat daripada
ingatan guru. Setiap sekolah bebas memilih waktunya sendiri — tiada deploy
diperlukan selepas ini.

---

## D. Pasang rules terkini

Firestore → Rules → tampal `firestore.rules` → **Publish**.

Ada peraturan baharu untuk koleksi `token`. Tanpa itu, guru tidak boleh mendaftarkan perantinya.

---

## E. Hidupkan pada telefon guru

Setiap guru: buka app → Menu → **Peringatan harian** → benarkan notifikasi. Label bertukar kepada **Hidup**.

Nota untuk iPhone: Apple hanya membenarkan notifikasi web selepas app **dipasang ke skrin utama**. Guru iPhone perlu tekan Share → Add to Home Screen dahulu, kemudian buka dari ikon itu.

Jika kunci VAPID kosong atau Cloud Functions belum dipasang, app akan tanya waktu dan guna peringatan tempatan sebagai ganti — berfungsi hanya semasa app dalam ingatan telefon.

---

## F. Menjaga kos serendah mungkin

Tetapan berikut sudah dimasukkan dalam `functions/index.js`:

| Tetapan | Nilai | Sebab |
|---|---|---|
| `region` | asia-southeast1 | Singapura, paling dekat dan murah untuk Malaysia |
| `memory` | 256MiB | Saiz terkecil |
| `minInstances` | 0 | Tiada instance menunggu, jadi tiada caj masa melahu |
| `maxInstances` | 2 | Had perbelanjaan jika berlaku ralat berulang |
| Bilangan jadual | 1 | Cloud Scheduler percuma sehingga 3 jadual |

**Anggaran penggunaan bulanan**
- Panggilan fungsi: ~176 (percuma sehingga 2,000,000)
- Masa pengiraan: beberapa saat sehari (percuma sehingga 400,000 GB-saat)
- FCM: percuma tanpa had
- Cloud Scheduler: 1 jadual (percuma sehingga 3)
- Artifact Registry: simpanan imej fungsi, lebih kurang **RM0.20–0.50 sebulan**

Satu-satunya caj sebenar ialah simpanan imej. Untuk mengecilkannya:

Google Cloud Console → **Artifact Registry** → repositori `gcf-artifacts` → **Cleanup policies** → tambah polisi buang versi lebih 7 hari. Simpan.

**Tetapkan amaran belanjawan** supaya tiada kejutan:
Google Cloud Console → **Billing** → **Budgets & alerts** → Create budget → RM10 sebulan → amaran pada 50%, 90%, 100%.

---

## G. Menyahpasang jika perlu

```bash
firebase functions:delete peringatanHarian --region asia-southeast1
```

App akan kembali menggunakan peringatan tempatan secara automatik.
