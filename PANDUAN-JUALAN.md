# EZ-HADIR — Panduan Pemilik

Satu pemasangan, banyak sekolah. Setiap sekolah hanya nampak datanya sendiri.

---

## A. Pemasangan sekali sahaja

> **Penting:** app mesti dibuka melalui alamat `http://` atau `https://`.
> Membuka fail `index.html` terus dari komputer (`file://`) menyebabkan butang
> log masuk tidak berfungsi, kerana Firebase menolak asal `file://`.
> Untuk uji di komputer: buka folder itu dalam Terminal, jalankan
> `python -m http.server 8000`, kemudian layari `http://localhost:8000`.

**1. Firebase**
- Authentication → Sign-in method → aktifkan **Google**
- Authentication → Settings → Authorized domains → tambah domain hosting anda
- Firestore Database → Create database (mod production)
- Firestore → Rules → tampal isi `firestore.rules` → Publish
- Storage → Rules → tampal isi `storage.rules` → Publish

**2. Tukar emel pemilik di DUA tempat**
- `index.html` → `CONFIG.PEMILIK` (kini `juscinta89@gmail.com`)
- `firestore.rules` → fungsi `pemilik()`

Kedua-duanya mesti sama. Yang dalam rules ialah kunci sebenar; yang dalam index.html cuma menentukan butang mana muncul.

**3. Hosting**
Upload ketujuh-tujuh fail ke root repo GitHub Pages, atau `firebase deploy --only hosting`.

---

## B. Menambah sekolah pelanggan baharu

Selepas bayaran diterima, ambil masa dua minit:

1. Log masuk ke app dengan akaun pemilik
2. Menu → **Panel pemilik** → tab **Daftar baharu**
3. Isi nama sekolah, ID (dijana automatik), emel Google guru besar atau penyelaras, dan tarikh tamat langganan
4. Tekan **Daftar sekolah**

Hantar kepada pelanggan:
- Pautan: `https://domain-anda/?s=sk-belukar`
- Nota: guru mesti log masuk dengan akaun Google yang didaftarkan

Admin sekolah itu kemudian uruskan sendiri:
- Import fail Excel APDM → senarai kelas dan murid
- Isi token bot Telegram dan Chat ID kumpulan sekolah
- Tambah emel guru-guru lain dalam tab **Guru**

Anda tidak perlu menyentuh data mereka lagi.

---

## C. Pembaharuan dan tamat langganan

Panel pemilik → ketuk nama sekolah:

| Pilihan | Kesan |
|---|---|
| 1 | Buka sekolah itu untuk semakan |
| 2 | Aktif / nyahaktif serta-merta |
| 3 | Tukar tarikh tamat langganan |
| 4 | Lantik admin tambahan |

Bila langganan tamat atau sekolah dinyahaktifkan, Firestore rules menyekat bacaan senarai murid dan tetapan Telegram. App masih boleh dibuka tetapi memaparkan sebab dan tidak boleh menghantar laporan. Tiada data dipadam — sebaik sahaja tarikh diperbaharui, semuanya kembali seperti biasa.

---

## D. Cara data dipisahkan

```
pengguna/cikgu@moe-dl.edu.my    { sid: "sk-belukar", peranan: "guru" }

sekolah/sk-belukar/
   ├─ kelas/{id}         nama kelas + senarai murid
   └─ tetapan/telegram   token bot + chat id
sekolah/sk-cherang/
   └─ ... (berasingan sepenuhnya)
```

Setiap kebenaran disemak terhadap baris `pengguna` milik orang yang log masuk. Guru SK Belukar mempunyai `sid: "sk-belukar"`, jadi permintaan ke data SK Cherang ditolak oleh pelayan Firestore, bukan sekadar disembunyikan dalam app.

Satu emel = satu sekolah. Kalau seseorang berpindah sekolah, admin sekolah baharu tambah emelnya semula dan baris lama ditulis ganti.

Setiap sekolah guna bot Telegram sendiri. Token satu sekolah tidak boleh dibaca sekolah lain.

---

## E. Peranan

| Peranan | Boleh buat |
|---|---|
| Pemilik (anda) | Semua sekolah, cipta dan tamatkan langganan |
| Admin sekolah | Senarai murid, tetapan Telegram, tambah buang guru — sekolah sendiri sahaja |
| Guru | Tanda kehadiran dan hantar laporan |

---

## F. Kos

Firestore percuma sehingga 50,000 bacaan sehari. Satu guru membuka app sekali sehari menggunakan kira-kira 25 bacaan. Anggaran kasar: **kira-kira 100 sekolah** masih dalam kuota percuma. Selepas itu, pelan Blaze biasanya di bawah RM20 sebulan pada skala ini.

---

## G. Bila kemas kini fail app

Buka `sw.js`, naikkan nombor `VERSI` (contoh `ezhadir-v7` → `ezhadir-v8`). Tanpa itu, telefon guru terus guna versi lama yang tersimpan.
