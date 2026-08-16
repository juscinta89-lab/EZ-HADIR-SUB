# EZ-HADIR — Panduan Setup Lengkap (v25)

Ikut dari BAHAGIAN 1 hingga 9 mengikut urutan. Setiap bahagian menyatakan
cara mengesahkannya berjaya sebelum ke bahagian seterusnya.

**Data sedia ada anda selamat.** Versi ini menggunakan struktur Firestore
yang sama — sekolah, pengguna, kelas, rekod, tetapan dan jemputan yang
sudah wujud terus digunakan tanpa sebarang perpindahan data.

---

## Gambaran sistem

```
Telefon guru ──► GitHub Pages (fail app) ──► Firebase Auth (log masuk Google)
                                          ──► Firestore (semua data)
                                          ──► Telegram API (laporan kelas)
Cloud Functions (jadual tiap jam) ──► FCM ──► Notifikasi ke telefon
```

Senarai fail dan destinasinya:

| Fail | GitHub Pages | Deploy Firebase |
|---|---|---|
| index.html, sw.js, manifest.json, semua .png | ✔ upload | — |
| firestore.rules, storage.rules | — | ✔ (tampal dalam Console) |
| firebase.json, functions/ | — | ✔ (deploy dari komputer) |
| PANDUAN-*.md | — | — (rujukan anda) |

**PENTING:** fail `firebase-messaging-sw.js` dari versi lama TIDAK wujud
lagi. Jika ia masih ada dalam repo GitHub anda, PADAM. Kewujudannya
mematikan notifikasi (dua service worker berlanggar).

---

## BAHAGIAN 1 — Firebase Console (5 minit)

Semua di https://console.firebase.google.com, projek **ez-hadir-subscribe**.

**1.1 Log masuk Google**
Authentication → Sign-in method → Google → Enable → pilih support email → Save.
*(Jika sudah Enabled, langkau.)*

**1.2 Domain dibenarkan**
Authentication → Settings → Authorized domains → Add domain:
```
juscinta89-lab.github.io
```
Tanpa `https://`, tanpa `/EZ-HADIR-SUB/`. Tanpa langkah ini log masuk gagal.

**1.3 Firestore**
Firestore Database sudah wujud dengan data anda — jangan sentuh datanya.

**1.4 Rules**
Firestore Database → Rules → padam semua → tampal keseluruhan isi fail
`firestore.rules` dari zip ini → **Publish**.
Rules ini merangkumi koleksi: pengguna, sekolah, kelas, tetapan, rekod,
token, jemputan. Versi rules lama tidak lengkap.

**1.5 Storage rules** *(jika Storage diaktifkan)*
Storage → Rules → tampal isi `storage.rules` → Publish.

✅ **Sahkan:** Rules menunjukkan tarikh publish hari ini.

---

## BAHAGIAN 2 — Kunci VAPID (sudah siap, semak sahaja)

Kunci anda sudah tertanam dalam `index.html`:
```
VAPID: "BBV-mqCUOBu3VzHePqk7zOtBqtDPovw5QgvU0lJalIHcjXqdrVt1vXJDRRKjrfSDZQDYSgEAxo8Rg5QLfNbkoyo"
```

✅ **Sahkan ia masih sah:** Project settings ⚙️ → Cloud Messaging →
Web Push certificates — kunci di situ mesti bermula `BBV-mqCU`.
Jika berbeza (pernah dijana semula), salin yang baharu dan ganti dalam
`index.html` baris `VAPID:`.

---

## BAHAGIAN 3 — API Cloud Messaging (2 minit)

1. https://console.cloud.google.com → pilih projek **ez-hadir-subscribe**
2. ☰ → APIs & Services → Enabled APIs & services
3. Cari **Firebase Cloud Messaging API** dalam senarai

Jika TIADA: butang **+ ENABLE APIS AND SERVICES** → cari
`Firebase Cloud Messaging API` → Enable.

"Cloud Messaging API (Legacy)" tidak perlu — abaikan.

✅ **Sahkan:** ia tersenarai dalam Enabled APIs.

---

## BAHAGIAN 4 — GitHub Pages (5 minit)

Repo: `juscinta89-lab/EZ-HADIR-SUB`

**4.1 Padam fail lama**
Jika `firebase-messaging-sw.js` wujud dalam repo → buka fail → ikon
tong sampah → Commit changes. **Langkah ini wajib.**

**4.2 Upload fail baharu** (ganti semua yang lama):
```
index.html
sw.js
manifest.json
icon-192.png
icon-512.png
icon-maskable-512.png
apple-touch-icon.png
```

**4.3 Tunggu binaan siap** — tab Actions bertanda hijau (1–2 minit).

✅ **Sahkan:**
- `https://juscinta89-lab.github.io/EZ-HADIR-SUB/` terbuka
- `https://juscinta89-lab.github.io/EZ-HADIR-SUB/sw.js` memaparkan kod
  dengan baris pertama mengandungi `ezhadir-v25`
- `https://juscinta89-lab.github.io/EZ-HADIR-SUB/firebase-messaging-sw.js`
  memberi **404** (memang sepatutnya tiada)

---

## BAHAGIAN 5 — Cloud Functions (10 minit, sekali sahaja)

Di Mac, dalam Terminal:

```bash
cd (seret folder ez-hadir ke sini)
firebase login
firebase use ez-hadir-subscribe
cd functions
rm -rf node_modules package-lock.json
npm install
cd ..
firebase deploy --only functions
```

Jawab **Y** untuk sebarang soalan API. Deploy pertama 3–8 minit.

**Ralat biasa dan penyelesaiannya:**

| Ralat | Penyelesaian |
|---|---|
| `Upgrading from 1st Gen to 2nd Gen is not supported` | `firebase functions:delete ujiNotifikasi` kemudian deploy semula |
| `Couldn't find firebase-functions package` | `npm install` belum dijalankan dalam folder functions |
| `EEXIST / permission denied` npm | `sudo chown -R $(whoami) ~/.npm` kemudian cuba semula |
| Soalan cleanup policy container images | Taip **1** |
| Fungsi lama `peringatanPagi` / `semakanTengahari` masih wujud | `firebase functions:delete peringatanPagi semakanTengahari` |

✅ **Sahkan:** keluar `Deploy complete!` dengan dua fungsi:
`peringatanHarian` dan `ujiNotifikasi`. Kemudian di Cloud Console →
Cloud Scheduler, jadual `peringatanHarian` berstatus Enabled dengan
frequency `30 6-13 * * 1-5`.

---

## BAHAGIAN 6 — Bersihkan peranti (WAJIB pada setiap peranti yang pernah guna versi lama)

Service worker lama tersimpan dalam pelayar dan akan terus digunakan
walaupun fail di pelayan sudah baharu.

**Android Chrome:**
Chrome → ⋮ → Settings → Site settings → All sites →
`juscinta89-lab.github.io` → **Clear & reset**.
Jika app pernah dipasang ke skrin utama: nyahpasang dahulu, pasang semula
selepas langkah 7.

**Mac Chrome:**
Buka app → Cmd+Option+I → tab Application → Service Workers →
**Unregister** semua → Storage → **Clear site data** → tutup DevTools →
Cmd+Shift+R.

Peranti baharu yang tidak pernah buka app tidak perlu langkah ini.

---

## BAHAGIAN 7 — Ujian berperingkat

Buka `https://juscinta89-lab.github.io/EZ-HADIR-SUB/`

**7.1 Log masuk** dengan `juscinta89@gmail.com`.
Gagal? Ketuk "Kenapa saya tak boleh masuk?" — panel itu menyatakan punca.

**7.2 Data sedia ada** — sekolah, kelas dan senarai murid anda sepatutnya
terus muncul seperti biasa.

**7.3 Diagnostik notifikasi** — Menu → Diagnostik notifikasi. Sasaran:
```
Protokol      : https:  ok
Kunci VAPID   : diisi (BBV-mqCUOBu3…)
Service worker: 1 berdaftar        ← mesti 1
  sw.js @ /EZ-HADIR-SUB/
SW aktif      : ya
```
Jika `2 berdaftar` → Bahagian 4.1 atau 6 belum dibuat.

**7.4 Hidupkan peringatan** — Menu → Peringatan harian → Allow.
Label bertukar **Hidup**. Semak diagnostik semula:
`Langganan push: ada`, `Token pelayan: ada`.
(`Token pelayan: TIADA` = rules belum publish → Bahagian 1.4)

**7.5 Uji paparan tanpa pelayan** (Mac):
DevTools → Application → Service Workers → butang **Push** di sebelah
sw.js. Notifikasi mesti keluar. Ini membuktikan telefon/pelayar mampu
memaparkan notifikasi.

**7.6 Uji hujung ke hujung** — Menu → **Uji notifikasi sekarang**,
kemudian **kunci skrin** atau tukar app. Notifikasi latar tidak muncul
jika app sedang terbuka — itu normal; anda akan nampak toast hijau
sebagai ganti.

Jika gagal, kotak amaran memberi laporan (Langkah / Token / Kod ralat):

| Kod | Tindakan |
|---|---|
| `registration-token-not-registered` | Matikan & hidupkan semula Peringatan harian |
| `authentication-error` | Bahagian 3 belum dibuat |
| `not-found` pada fungsi | Bahagian 5 belum dibuat |

**7.7 Uji Telegram** — pilih kelas → tanda seorang tidak hadir →
Hantar ke Telegram. Mesej masuk ke kumpulan, dan Menu → Laporan &
analisis menunjukkan rekod hari ini.

---

## BAHAGIAN 8 — Tetapan peranti (jika 7.5 gagal)

**Android:** Settings → Apps → Chrome → Notifications ON (termasuk
channel "Sites"); Battery → Unrestricted; DND off. Telefon
Xiaomi/Huawei/Oppo/Vivo: lihat dontkillmyapp.com.

**Mac:** System Settings → Notifications → Google Chrome → Allow.

**iPhone:** notifikasi HANYA berfungsi selepas Add to Home Screen dan
dibuka dari ikon itu.

**Galakkan guru memasang app ke skrin utama** — Chrome (sejak Okt 2025)
menarik balik kebenaran notifikasi laman yang jarang dilawati, tetapi
app yang dipasang dikecualikan.

---

## BAHAGIAN 9 — Operasi harian

**Waktu peringatan** (setiap sekolah pilih sendiri, tiada deploy):
Menu → Tetapan admin → Telegram → Waktu peringatan.
Ingatan guru (lalai 7:30 pagi, semua guru) dan Semakan admin
(lalai 10:30 pagi, senarai kelas belum lapor kepada admin sahaja).

**Minggu persekolahan** — di ruangan yang sama. WAJIB ditetapkan:
- **Ahad – Khamis** untuk Kelantan, Terengganu, Johor, Kedah
- **Isnin – Jumaat** untuk negeri lain

Tetapan ini menentukan hari mana notifikasi dihantar, dan hari mana
senarai "Belum lapor hari ini" dipaparkan dalam Laporan. Jika belum
ditetapkan, senarai belum lapor akan dipaparkan pada semua hari.

**Tambah guru:** Tetapan admin → Guru → Buat pautan jemputan → WhatsApp.
Guru buka pautan, log masuk, terus berdaftar. Pautan sah 30 hari, boleh
dibatalkan.

**Sekolah pelanggan baharu:** Menu → Panel pemilik → Daftar baharu.
Hantar pautan `https://juscinta89-lab.github.io/EZ-HADIR-SUB/?s=<id>`.

**Langganan:** Panel pemilik → ketuk sekolah → aktif/nyahaktif atau tukar
tarikh tamat. Tamat = akses data disekat oleh rules, data kekal.

**Laporan:** Menu → Laporan & analisis. Semua orang boleh lihat dan
muat turun CSV; hanya admin boleh Hantar ringkasan ke Telegram.

**Satu butang dua kerja:** butang **Hantar ke Telegram** menyimpan rekod
kehadiran untuk laporan harian DAN menghantar mesej ke Telegram sekali
gus. Rekod disimpan dahulu, jadi laporan tetap tepat walaupun Telegram
gagal (token salah, tiada talian). Toast akan menyatakan yang mana
berjaya:
- "Dihantar ke Telegram dan direkod dalam laporan." — kedua-duanya OK
- "Kehadiran direkod. Telegram gagal: …" — laporan selamat, semak tetapan Telegram
- "Dihantar ke Telegram, tetapi rekod laporan gagal disimpan." — semak firestore.rules

**Setiap kali kemas kini fail app:** naikkan `VERSI` dalam `sw.js`
(`ezhadir-v25` → `v26`), jika tidak telefon guru kekal pada versi lama.

---

## Senarai semak akhir

- [ ] 1.2 Domain `juscinta89-lab.github.io` dalam Authorized domains
- [ ] 1.4 firestore.rules v25 di-Publish
- [ ] 3 Firebase Cloud Messaging API enabled
- [ ] 4.1 firebase-messaging-sw.js DIPADAM dari repo
- [ ] 4.2 7 fail baharu di GitHub Pages, sw.js = v25
- [ ] 5 `peringatanHarian` + `ujiNotifikasi` deployed
- [ ] 6 Clear & reset pada peranti lama
- [ ] 7.3 Diagnostik: 1 service worker
- [ ] 7.6 Uji notifikasi berjaya dengan skrin dikunci
- [ ] 7.7 Laporan Telegram masuk dan rekod tersimpan
