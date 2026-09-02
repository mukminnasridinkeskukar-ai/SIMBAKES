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
│   ├── supabase-config.js      ← ⚙️ KONFIGURASI SUPABASE (URL + anon key + init)
│   └── ui-overhaul.js          ← Skrip UI overhaul (lihat catatan di bawah)
├── sql/
│   └── RLS-akun-peserta-CRUD.sql ← 🆕 Skrip policy DELETE (jalankan 1x di Supabase)
├── perbaikan-opsional/         ← (opsional) 2 file hasil perbaikan typo lama
└── README-GITHUB.md            ← file ini
```

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
