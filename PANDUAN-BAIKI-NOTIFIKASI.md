# EZ-HADIR — Membaiki Notifikasi Tolak

Ikut urutan ini. Jangan langkau. Setiap bahagian membuktikan satu lapisan berfungsi sebelum ke lapisan berikutnya.

---

## Apa yang berubah dalam versi ini

Punca utama kegagalan sebelum ini: **dua service worker berebut skop yang sama**. `sw.js` (cache PWA) dan `firebase-messaging-sw.js` (notifikasi) kedua-duanya didaftarkan pada `/EZ-HADIR-SUB/`. Dalam pelayar, hanya **satu** service worker boleh menguasai satu skop — pendaftaran kedua menggantikan yang pertama. Akibatnya, notifikasi sampai ke peranti tetapi service worker yang memegang langganan sudah tiada.

Perubahan:

| Perkara | Sebelum | Sekarang |
|---|---|---|
| Service worker | Dua fail, skop bertindih | **Satu** fail `sw.js` sahaja |
| `firebase-messaging-sw.js` | Wujud | **Dipadam** — jangan upload lagi |
| URL ikon dan pautan | Relatif (`icon-192.png`) | **Penuh** (`https://.../EZ-HADIR-SUB/icon-192.png`) |
| Tag notifikasi | Tetap (`ez-pagi`) | **Unik ikut tarikh** + `renotify` |
| Kaedah hantar | `sendEachForMulticast` | `sendEach` dengan mesej per peranti |
| Menunggu SW | Tiada had masa | **Tamat masa 12 saat** dengan mesej jelas |
| Kegagalan gstatic | SW mati sepenuhnya | Dibungkus `try/catch`, cache PWA kekal hidup |

Sebab URL mesti penuh: app awak di-hos dalam **subfolder** (`/EZ-HADIR-SUB/`), bukan di root domain. Path relatif dalam notifikasi diselesaikan terhadap root domain, jadi ikon 404 dan pautan rosak.

---

## BAHAGIAN 1 — Buang fail lama dari GitHub

1. Buka repo `EZ-HADIR-SUB` di GitHub
2. Cari fail **`firebase-messaging-sw.js`**
3. Tekan ikon tong sampah → Commit changes

Fail ini mesti dibuang. Kalau ia kekal, pelayar akan terus mendaftarkannya dan masalah asal berulang.

---

## BAHAGIAN 2 — Upload fail baharu

Upload semua fail dari zip ini ke root repo, ganti yang lama:

```
index.html
sw.js
manifest.json
icon-192.png
icon-512.png
icon-maskable-512.png
apple-touch-icon.png
```

Fail `firebase.json`, `firestore.rules`, `storage.rules` dan folder `functions` **tidak perlu** di GitHub Pages — itu untuk deploy sahaja.

Tunggu 1–2 minit sehingga GitHub Pages selesai membina (tab Actions akan bertanda hijau).

---

## BAHAGIAN 3 — Deploy Cloud Functions

```bash
cd folder-ez-hadir
firebase deploy --only functions
```

Tunggu sehingga keluar `Deploy complete!`.

Jika keluar ralat **"Upgrading from 1st Gen to 2nd Gen is not yet supported"**:

```bash
firebase functions:delete ujiNotifikasi
firebase deploy --only functions
```

Jika keluar amaran **"Couldn't find firebase-functions package"**:

```bash
cd functions
rm -rf node_modules package-lock.json
npm install
cd ..
firebase deploy --only functions
```

---

## BAHAGIAN 4 — Sahkan API Firebase Cloud Messaging aktif

1. Buka `console.cloud.google.com`
2. Pastikan projek **ez-hadir-subscribe** dipilih di bar atas
3. Menu ☰ → **APIs & Services** → **Enabled APIs & services**
4. Cari **Firebase Cloud Messaging API**

Kalau tiada: **+ ENABLE APIS AND SERVICES** → cari `Firebase Cloud Messaging API` → **Enable**.

Nota: "Cloud Messaging API (Legacy)" **tidak perlu** diaktifkan. Google menamatkannya pada Julai 2024 dan app ini tidak menggunakannya langsung.

---

## BAHAGIAN 5 — Bersihkan telefon (WAJIB)

Service worker lama masih tersimpan dalam telefon dan akan terus digunakan. Ini langkah yang paling kerap terlepas.

**Android Chrome:**
1. Chrome → tiga titik → **Settings**
2. **Site settings** → **All sites**
3. Cari `juscinta89-lab.github.io`
4. Tekan **Clear & reset**
5. Kalau app sudah dipasang ke skrin utama, nyahpasang dan pasang semula

**Mac Chrome:**
1. Buka app
2. Tekan **Cmd+Option+I** untuk buka DevTools
3. Tab **Application** → **Service Workers**
4. Tekan **Unregister** pada setiap satu yang tersenarai
5. **Storage** → **Clear site data**
6. Tutup DevTools, tekan **Cmd+Shift+R**

---

## BAHAGIAN 6 — Semak diagnostik

Buka app → Menu → **Diagnostik notifikasi**.

Sasaran yang betul:

```
Protokol      : https:  ok
Kunci VAPID   : diisi (BBV-mqCUOBu3…)
Kebenaran     : granted
Service worker: 1 berdaftar          ← MESTI 1, bukan 2
  sw.js @ /EZ-HADIR-SUB/
SW aktif      : ya
Langganan push: ada
Token tempatan: ada
Token pelayan : ada
```

Maksud setiap baris kalau salah:

| Baris | Nilai salah | Maksud dan tindakan |
|---|---|---|
| Service worker | `2 berdaftar` | `firebase-messaging-sw.js` masih ada. Ulang Bahagian 1 dan 5 |
| SW aktif | `TIDAK` | Rangkaian menyekat `gstatic.com`. Cuba data mudah alih |
| Kebenaran | `denied` | Awak pernah tolak. Site settings → Notifications → Allow |
| Kebenaran | `default` | Belum hidupkan. Menu → Peringatan harian |
| Langganan push | `TIADA` | Hidupkan Peringatan harian dahulu |
| Token pelayan | `TIADA` | Firestore rules belum di-Publish. Lihat Bahagian 8 |

---

## BAHAGIAN 7 — Uji berperingkat

### Ujian A: papar notifikasi tanpa pelayan

Ini membuktikan telefon dan service worker boleh memaparkan notifikasi, tanpa melibatkan Firebase langsung.

**Di Mac Chrome:**
1. Buka app, tekan Cmd+Option+I
2. Tab **Application** → **Service Workers**
3. Tekan butang **Push** di sebelah `sw.js`

- Notifikasi keluar → lapisan paparan **OK**, teruskan ke Ujian B
- Keluar mesej "This site has been updated in the background" → service worker menerima push tetapi tidak memaparkan apa-apa
- Tiada apa-apa → semak kebenaran notifikasi peringkat sistem (Bahagian 9)

### Ujian B: hujung ke hujung melalui pelayan

1. Menu → **Peringatan harian** → benarkan. Label bertukar **Hidup**
2. **Kunci skrin telefon** atau tukar ke app lain
3. Menu → **Uji notifikasi sekarang**

Notifikasi latar belakang **tidak akan** muncul kalau app sedang terbuka di depan mata — dalam keadaan itu awak hanya nampak toast hijau. Ini bukan pepijat.

Kalau gagal, kotak amaran akan menunjukkan laporan penuh:

```
Langkah  : hantar FCM
Token    : 1
Gagal    : 1
Kod      : messaging/registration-token-not-registered
```

| Kod | Maksud | Tindakan |
|---|---|---|
| `registration-token-not-registered` | Token mati | Matikan dan hidupkan semula Peringatan harian |
| `invalid-argument` | Payload rosak | Deploy semula functions |
| `authentication-error` | API belum aktif | Ulang Bahagian 4 |
| `third-party-auth-error` | Kunci VAPID salah | Jana semula, tampal dalam index.html |

Untuk melihat log pelayan:

```bash
firebase functions:log --only ujiNotifikasi
```

---

## BAHAGIAN 8 — Pasang Firestore rules

Firestore → **Rules** → tampal isi `firestore.rules` → **Publish**.

Ada peraturan baharu untuk koleksi `token`. Tanpa ia, token tidak dapat disimpan dan diagnostik akan tunjuk `Token pelayan: TIADA`.

---

## BAHAGIAN 9 — Kalau semua betul tetapi masih senyap

Ini biasanya di luar kawalan kod.

**Android:**
- Settings → Apps → **Chrome** → Notifications → pastikan **ON**, dan cari channel **"Sites"** — mesti ON juga
- Settings → Apps → Chrome → Battery → tukar dari *Restricted* kepada **Unrestricted**
- Matikan **Do Not Disturb**
- Telefon Xiaomi, Huawei, Oppo, Vivo mempunyai pengurus bateri agresif. Cari nama telefon awak di `dontkillmyapp.com`

**Mac:**
- System Settings → Notifications → **Google Chrome** → Allow notifications ON

**Chrome membuang kebenaran secara automatik:** sejak Oktober 2025, Chrome menarik balik kebenaran notifikasi untuk laman yang jarang digunakan tetapi banyak menghantar. App yang **dipasang ke skrin utama dikecualikan**. Jadi galakkan guru menekan **Pasang ke skrin utama** — ini bukan sekadar untuk kemudahan.

**iPhone:** Apple hanya membenarkan notifikasi web selepas app dipasang ke skrin utama. Safari biasa tidak akan berfungsi walau apa pun tetapan.

---

## BAHAGIAN 10 — Waktu peringatan

Menu → Tetapan admin → Telegram → **Waktu peringatan**

| Medan | Fungsi |
|---|---|
| Ingatan guru | Semua guru diingatkan merekod kehadiran |
| Semakan admin | Admin terima senarai kelas yang belum lapor |
| Hidupkan peringatan | Matikan semua notifikasi untuk sekolah ini |

Satu jadual berjalan setiap jam dari 6:30 pagi hingga 1:30 petang, Isnin hingga Jumaat, kemudian menyemak tetapan setiap sekolah. Jadi waktu ditukar dari dalam app — tiada deploy diperlukan.

**Menguji jadual:** Cloud Console → Cloud Scheduler → tiga titik pada `peringatanHarian` → **Force run**. Ambil perhatian ia hanya menghantar kalau **jam semasa padan** dengan waktu yang ditetapkan. Kalau awak tekan Force run pukul 3 petang sedangkan tetapan 7:30 pagi, fungsi berjalan tetapi tidak menghantar apa-apa — itu betul, bukan gagal. Guna butang **Uji notifikasi sekarang** untuk ujian bila-bila masa.

---

## Setiap kali kemas kini fail app selepas ini

Buka `sw.js`, naikkan nombor pada baris pertama:

```js
const VERSI = 'ezhadir-v24';   →   'ezhadir-v25'
```

Tanpa ini, telefon guru terus menggunakan versi lama yang tersimpan.
