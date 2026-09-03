# SIMBAKES — Versi Pecah (Multi-File)

Hasil pemecahan `index (35).html` (1,2 MB) menjadi beberapa file kecil agar ringan
dan mudah diedit. **Isi template tidak diubah sama sekali** — semua kode dipindah
apa adanya, sudah diverifikasi byte-per-byte identik dengan file asli, dan diuji
di browser: tampilan, log, dan perilaku 100% sama.

## Struktur File

```
simbakes-split/
├── index.html                  ← HTML saja (194 KB, sebelumnya 1,2 MB)
├── css/
│   ├── styles-base.css         ← CSS utama (reset, sidebar, login, modal, dll)
│   ├── styles-tables.css       ← CSS tabel penetapan
│   └── ui-overhaul.css         ← CSS UI overhaul (Tahoma, glassmorphism, lightbox)
├── js/
│   ├── crud-lightbox.js        ← Sistem lightbox CRUD lama (muat sebelum <body>)
│   ├── admin-crud.js           ← Panel admin "SISTEM FINAL" (tabel 5 kolom, CRUD)
│   ├── system-check.js         ← Verifikasi fungsi kritis di console
│   ├── 01-core.js              ← Konfig awal, data store, pagination, debounce
│   ├── 02-auth-navigation.js   ← Login admin RBAC + navigasi halaman
│   ├── 03-admin-data.js        ← Lulus tes masuk PT + data penetapan (CRUD)
│   ├── 04-form.js              ← Unggah berkas, Google Drive, validasi & kirim form
│   ├── 05-database.js          ← Fungsi database Supabase (submissions, roadmap, multiusers)
│   ├── 06-image-handler.js     ← Google Drive image handler v2.0
│   ├── 07-dashboard.js         ← Statistik pengunjung real-time
│   ├── 08-roadmap.js           ← Roadmap kebutuhan (publik + admin)
│   ├── 09-cek-status.js        ← Cek status pengajuan & penetapan
│   ├── 10-admin-pengusul.js    ← Admin panel data pengusul v3.0
│   ├── 11-topbar-session.js    ← Topbar login + login peserta + proteksi halaman
│   ├── 12-multiuser-init.js    ← Multi-user session + registrasi user + inisialisasi
│   ├── 13-akun-peserta.js      ← 🆕 Data Akun Peserta (CRUD tabel akun_peserta)
│   ├── 14-panel-admin-fix.js   ← 🆕 Panel Admin Fix (sesi tahan refresh + pulihkan menu admin)
│   ├── 15-bukti-pendaftaran.js ← 🆕🆕 BUKTI PENDAFTARAN (terbitkan/cetak ulang setelah kirim)
│   ├── supabase-config.js      ← ⚙️ KONFIGURASI SUPABASE (URL + anon key + init)
│   └── ui-overhaul.js          ← Skrip UI overhaul (lihat catatan di bawah)
├── sql/
│   └── RLS-akun-peserta-CRUD.sql ← 🆕 Skrip policy DELETE (jalankan 1x di Supabase)
├── daftar-peserta.html         ← 🆕🆕 HALAMAN PENDAFTARAN AKUN PESERTA (wajib di-upload!)
├── perbaikan-opsional/         ← (opsional) 2 file hasil perbaikan typo lama
└── README-GITHUB.md            ← file ini
```

## 🆕🆕 Halaman Daftar Akun Peserta (`daftar-peserta.html`)
**Latar:** tombol **"Daftar Akun Peserta"** di kanan-atas (dan link "Daftar di Sini"
di modal Login Peserta) menunjuk ke `daftar-peserta.html` — file ini **belum pernah
ada** di hosting sehingga klik tombolnya menghasilkan **404** di console.

**Solusi:** halaman pendaftaran mandiri dibuat lengkap dan terintegrasi penuh:
- Koneksi Supabase memakai **file config yang sama** (`js/supabase-config.js`) — satu
  sumber untuk seluruh aplikasi; tidak ada kredensial dobel.
- Insert ke tabel **`akun_peserta`** dengan kolom persis skema: `nama, nik, email,
  username, password, jurusan_tujuan, status='pending'` — kolom lain tidak dikirim
  (hindari error PGRST204).
- Validasi konsisten dengan Panel Admin (modul 13): NIK tepat 16 digit, email,
  username huruf kecil 4-30 karakter, password min. 8 karakter + konfirmasi.
- **Cek duplikat dulu** (username / email / NIK) → pesan ramah sebelum insert;
  error unik `23505` juga ditangani.
- Daftar **Jurusan Tujuan sama persis** dengan dropdown admin (13 pilihan).
- Setelah sukses: panel ringkasan akun + instruksi menunggu verifikasi 1-2 hari
  kerja + tombol ke halaman **Login Peserta**.
- Alur lengkap: **Daftar → muncul di Panel Admin "Data Akun Peserta" (Menunggu) →
  admin setujui → peserta login via tombol "Login Peserta"** (sudah teruji ujung
  ke ujung).
- Link di `index.html` (topbar + modal login peserta) diubah dari URL absolut ke
  **relatif** (`daftar-peserta.html`) agar bekerja di domain mana pun (hosting
  sendiri, GitHub Pages, maupun preview lokal).

> 📤 **PENTING:** upload `daftar-peserta.html` + `index.html` ke root hosting
> (sejajar index.html). Tanpa file ini, tombol Daftar Akun Peserta akan 404 lagi.

## 🆕🆕 Bukti Pendaftaran (`js/15-bukti-pendaftaran.js`) — Perbaikan Menu Ajukan
**Latar:** Formulir "Ajukan Rekomendasi" TIDAK PERNAH bisa dikirim dari popup peserta.
Akar masalah: popup meng-CLONE `page-ajukan` sehingga semua `id` input ganda
(`nik`, `form-ajukan`, dst). Pengguna mengetik di clone, tetapi
`validateForm()/submitForm()` membaca form asli yang tersembunyi & kosong via
`getElementById` → selalu muncul "Mohon lengkapi field berikut" meski form terisi penuh.

**Perbaikan (file berubah):**
1. **`js/11-topbar-session.js`** — popup Ajukan & Cek Status kini **MEMINDAHKAN**
   (move, bukan clone) node halaman asli ke popup; saat ditutup node dikembalikan
   ke posisi semula. Tidak ada lagi id ganda; semua fungsi form bekerja normal.
2. **`js/04-form.js`** — `submitForm()` kini memvalidasi ulang seluruh form
   (defense-in-depth); setelah sukses, record disimpan ke `window.__buktiLastRecord`.
   `displayStatusResult()` kini memanggil `setActionButtons()` (sebelumnya fungsi
   mati — tombol aksi tidak pernah muncul di hasil Cek Status).
3. **`js/09-cek-status.js`** — tombol **🧾 Bukti Pendaftaran** ditambahkan untuk
   semua status + guard container.
4. **`index.html`** — tombol **"🧾 Unduh Bukti Pendaftaran"** di modal sukses,
   container `#status-actions` baru di kartu hasil Cek Status, dan include
   `js/15-bukti-pendaftaran.js`.
5. **`js/15-bukti-pendaftaran.js` (BARU)** — menerbitkan bukti pendaftaran resmi:
   - Layar bukti siap-cetak A4 (kop SIMBAKES, nomor register, data lengkap,
     status, lampiran, catatan) — otomatis membuka dialog **Cetak/Simpan PDF**.
   - Setelah submit sukses: klik tombol di modal sukses → bukti langsung terbit.
   - Kapan pun setelahnya: menu **Cek Status** (NIK / No. Register) → tombol
     🧾 Bukti Pendaftaran → cetak ulang. Data diambil langsung dari Supabase
     (tabel `submissions`) — satu sumber kebenaran.
   - Fallback bila popup diblokir browser: cetak via iframe tersembunyi.

**File yang wajib di-upload ke hosting (Task 9):**
- `index.html`
- `js/04-form.js`
- `js/09-cek-status.js`
- `js/11-topbar-session.js`
- `js/15-bukti-pendaftaran.js` ← **FILE BARU**
Lalu hard refresh (Ctrl+Shift+R).

**Verifikasi E2E (browser + Supabase live):** isi form lengkap → modal konfirmasi
muncul → kirim → data tersimpan di `submissions` (REST diverifikasi) → modal sukses
→ Bukti Pendaftaran terbit (tab cetak) → Cek Status menampilkan tombol Bukti
Pendaftaran → cetak ulang OK. Data uji dihapus setelah pengujian; console 0 error.

---

## Frontend: HTML + GitHub Pages

Tidak ada framework, tidak ada build step — murni HTML/CSS/JS statis.
Cara mengunggah ke GitHub Pages:

1. Buat repository baru di GitHub (mis. `simbakes`), pastikan **Public**.
2. Upload **seluruh isi folder ini** (jangan hanya index.html-nya) — struktur
   folder `css/` dan `js/` harus ikut. Lewat web: *uploading an existing file*,
   drag semua file + 2 folder. Lewat Git:
   ```bash
   git init
   git add .
   git commit -m "SIMBAKES versi pecah"
   git remote add origin https://github.com/USERNAME/simbakes.git
   git push -u origin main
   ```
3. Buka **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`,
   folder `/ (root)` → **Save**.
4. Tunggu 1–2 menit, situs aktif di:
   `https://USERNAME.github.io/simbakes/`

> Catatan: saat mengganti isi situs nanti, cukup edit file kecil yang relevan
> (mis. hanya `js/04-form.js`) tanpa menyentuh file raksasa lagi. Browser juga
> bisa meng-cache CSS/JS terpisah sehingga muat ulang lebih cepat.

## Backend: Supabase (tetap, tanpa perubahan)

- Koneksi memakai CDN `@supabase/supabase-js@2` (sudah ada di `index.html`).
- URL + anon key ada di **`js/supabase-config.js`**. Kalau ganti proyek Supabase,
  cukup edit file itu saja:
  ```js
  const SUPABASE_CONFIG = {
      url: 'https://xxxxx.supabase.co',
      anonKey: 'eyJ...',
  };
  ```
- Tabel yang dipakai: `submissions`, `roadmap`, `multiusers`, `akun_peserta` 🆕
  + storage bucket `simbakes` (folder `photos`).

## 🆕 Panel Admin Fix — Sesi Tahan Refresh (`js/14-panel-admin-fix.js`)

**Masalah yang diperbaiki:** setiap halaman di-refresh, login admin tiba-tiba
"hilang semua" — menu Data Pengusulan/Roadmap/Penetapan/Akun Peserta lenyap
dari sidebar dan section "Panel Admin" tampak kosong, padahal barusan login.

**Penyebab (bug bawaan template):** ada dua sistem auth yang sama-sama membaca
`localStorage "simbakes_admin_session"` dengan format berbeda. Modul auth lama
menyimpan `{ user, timestamp }`, sementara modul multi-user menuntut
`{ isLoggedIn, expiresAt }` dan **menghapus** sesi yang tidak cocok saat
halaman dimuat. Ditambah lagi, form login di sidebar sengaja disembunyikan CSS
(design login lewat tombol **"Login Admin" di kanan atas**), sehingga section
Panel Admin benar-benar tidak menampilkan apa pun saat sesi terhapus.

**Yang dilakukan modul ini (100% aditif, tidak mengubah modul lama):**
1. **Menyatukan kedua format sesi** sebelum modul multi-user berjalan, sehingga
   sesi login tidak lagi terhapus dan **tahan refresh** (maks. 8 jam).
2. **Memulihkan menu admin otomatis** saat halaman dibuka — tidak perlu login
   ulang atau klik dua kali setelah refresh.
3. **Klik "Panel Admin" saat belum login** kini langsung membuka form login
   (tidak lagi kosong tanpa pesan).
4. **Klik pertama setelah refresh** pada Data Pengusulan/Roadmap/Penetapan
   tidak lagi ditolak.
5. **Kartu dashboard tidak lagi mentok di 0** — statistik dirender ulang
   otomatis begitu koneksi Supabase siap.
6. Badge "PANEL ADMIN" dirapikan agar teks role tidak menumpuk.

> Catatan login: form login memang ada di **tombol "Login Admin" pojok kanan
> atas** (desain bawaan template). Setelah login sekali, sesi akan bertahan
> meski halaman di-refresh berkali-kali.

## 🆕 Perbaikan Darurat: 7+ Menu Kontennya Kosong Putih (`index.html`)

**Gejala:** setelah login, hampir semua menu (Roadmap Kebutuhan, Lulus Tes,
Petunjuk, Cek Status, Cek Penetapan, Data Pengusulan/Roadmap/Penetapan/Akun
Peserta) menampilkan **area konten kosong putih total**, padahal Dashboard dan
Ajukan Rekomendasi normal. Di console muncul error `roundRect ... Radius value
negative` dari `07-dashboard.js` (ini hanya gejala ikutan).

**Penyebab:** saat merapikan formulir (penghapusan field lama "Link Template
Opsional"), **satu tag `</div>` penutup ikut terhapus** di area tombol
"Download Template". Akibatnya div `page-ajukan` tidak pernah tertutup dan
**seluruh halaman setelahnya ikut "bersarang" di dalamnya** menurut parser
browser — sehingga meski diaktifkan lewat menu, halaman-halaman itu tetap
tersembunyi di dalam halaman Ajukan yang sedang nonaktif (`display:none`).

**Perbaikan:** tag `</div>` dikembalikan tepat setelah tombol Download Template
(menutup `.template-actions`). Keseimbangan tag kini 619/620 pas dan semua 11
halaman kembali menjadi anak langsung `<main>` (terverifikasi browser: 11/11
halaman render normal).

**Sekalian (kecil, `js/07-dashboard.js`):** auto-refresh statistik pengunjung
tiap 30 detik ikut dijaga — bila chart pengunjung sedang tidak terlihat
(user sedang di halaman lain), render dilewati sehingga error `roundRect`
tidak lagi muncul di console.

> ⚠️ **PENTING saat deploy ulang:** upload `index.html` + `js/07-dashboard.js`,
> lalu **hard-refresh browser (Ctrl+Shift+R)** — cache JS lama bisa membuat
> perbaikan tampak "tidak efek".

## 🆕 Fitur Baru: Data Akun Peserta (Panel Admin)

Menu **Data Akun Peserta** di Panel Admin (muncul setelah login admin) untuk
mengelola tabel `akun_peserta` — tabel yang dipakai login & registrasi peserta.

**Fitur CRUD lengkap:**
- 📋 **Lihat** — daftar akun dengan statistik (Total/Disetujui/Menunggu/Blok),
  pencarian (nama, username, email, NIK), filter status, urutan, pagination
- ➕ **Tambah** — modal akun baru: nama, NIK (16 digit), email, username,
  password, jurusan tujuan, status, catatan
- ✏️ **Edit** — ubah semua field akun (klik tombol ✏️ di baris tabel)
- ✅/🚫 **Set Status cepat** — setujui / tangguhkan langsung dari tabel
- 🗑️ **Hapus** — konfirmasi lalu hapus permanen

**PENTING — satu langkah setup di Supabase (wajib agar tombol Hapus berfungsi):**
Kebijakan keamanan tabel `akun_peserta` (RLS) saat ini sudah mengizinkan
baca/tambah/ubah, tetapi **belum mengizinkan hapus**. Buka **Supabase Dashboard
→ SQL Editor**, tempel isi `sql/RLS-akun-peserta-CRUD.sql`, lalu **Run**.
Setelah itu semua fungsi CRUD aktif 100%. Sebelum skrip dijalankan, tombol Hapus
akan menampilkan pesan peringatan yang jelas (bukan crash).

> Verifikasi yang sudah dilakukan: tambah akun lewat UI ✅ (tersimpan ke
> Supabase), edit akun lewat UI ✅ (tersimpan + updated_at otomatis), proteksi
> halaman tanpa login ✅, pencarian/filter/pagination ✅, error console tidak
> bertambah (tetap 3 error bawaan template).

## ⚠️ Temuan Audit: 2 Modul Lama Sudah Rusak Sejak File Asli

Saat verifikasi ditemukan 2 blok skrip yang **gagal parse (typo `}` hilang)
sejak file asli**, sehingga selama ini tidak pernah berjalan:

| File | Lokasi typo | Akibat selama ini |
|---|---|---|
| `js/crud-lightbox.js` | baris 660: `` `)`; `` seharusnya `` `)}`; `` | Seluruh modul lightbox CRUD lama mati (sudah digantikan `admin-crud.js`) |
| `js/ui-overhaul.js` | baris 26: `` `)` `` seharusnya `` `)}` `` | Seluruh skrip UI overhaul mati (CSS-nya tetap aktif lewat `ui-overhaul.css`) |

Keduanya **sengaja dipertahankan apa adanya** sesuai permintaan "jangan mengubah
template yang ada" — perilaku situs 100% sama dengan sekarang. Error ini hanya
terlihat di console (F12), tidak mengganggu fungsi yang sedang berjalan.

Folder `perbaikan-opsional/` berisi 2 file yang typo-nya sudah diperbaiki dan
lolos `node --check`. **Saran: jangan dipakai dulu.** Hasil uji memasang keduanya:
2 error syntax hilang, Supabase tetap terhubung, tampilan awal sama — tetapi
`ui-overhaul.js` tetap mati karena menabrak deklarasi `const SUPABASE_CONFIG`
yang sudah dipakai `supabase-config.js`, dan modul CRUD lama yang ikut aktif
bisa bentrok dengan sistem admin final yang sekarang bekerja normal. Kalau suatu
saat ingin benar-benar menghidupkan modul-modul lama, itu pekerjaan refactor
terpisah — hubungi saya bila ingin dilanjutkan.

## Peserta (Link Eksternal)

Formulir pendaftaran peserta mengarah ke
`https://simbakes.mukminnasri.com/daftar-peserta.html` — tidak termasuk dalam
paket ini (situs terpisah).

## Verifikasi yang Sudah Dilakukan

- ✅ Rak-ulang semua pecahan = file asli, **byte-identikal 100%** (28.523 baris).
- ✅ `node --check` lolos untuk 16 file JS utama.
- ✅ Uji browser: file asli vs versi pecahan — judul, tampilan landing, urutan
  log console, dan daftar error identik.
