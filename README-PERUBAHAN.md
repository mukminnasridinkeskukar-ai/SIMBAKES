# RINGKASAN PERUBAHAN — SIMBAKES (Revisi Privasi NIK, Profil Peserta, Role Observer)

> ⚠️ **REVISI LEBIH BARU DI BAGIAN PALING BAWAH FILE INI** — lihat bagian
> **"REVISI OPERATOR & UPLOAD FILE"** (Operator akses penuh, Rekomendasi
> Dinkes upload file, Form revisi upload file, SQL storage dirapikan).

Tanggal: 2 Oktober 2026

Revisi ini mengerjakan 3 permintaan sekaligus, tanpa mengubah fungsi/menu lama yang sudah berjalan.

---

## 1) NIK TIDAK LAGI TAMPIL DI MENU PUBLIK

**Aturan yang diterapkan:** NIK utuh hanya untuk sesi Panel Admin yang login
(superadmin / operator / viewer / observer — "sesuai levelnya").
Pengunjung publik & peserta melihat versi disamarkan (`6402••••••••0002`)
atau tidak sama sekali.

### Titik yang diperbaiki

| Lokasi | Sebelum | Sesudah |
|---|---|---|
| Popup "Lulus Tes Masuk PT" (`js/03-admin-data.js`) | NIK tampil utuh saat popup | Baris NIK dihapus total untuk pembaca umum; hanya muncul bila dibuka dari sesi Panel Admin |
| Kartu "Lihat Detail" halaman publik | Record utuh (termasuk NIK) disisipkan ke atribut onclick HTML | Kirim INDEX saja; record disimpan di memori tanpa kolom NIK |
| Pengambilan data halaman publik | `select('*')` mengirim NIK ke browser semua pengunjung | Prioritas RPC server `app_get_lulus_tes()` yang tidak pernah mengirim NIK; fallback tetap menyaring kolom NIK di sisi browser |
| Dashboard (modal Lulus PT / Penerima) | `select('*')` | Kolom NIK/kontak dihapus sebelum dipakai |
| Cek Status Pengajuan (header hasil) | `nik: 6402...` utuh | Disamarkan |
| Cek Status Penetapan (badge NIK) | NIK utuh | Disamarkan |
| Bukti Pendaftaran (cetak/PDF) | NIK utuh | Disamarkan |
| Modal info akun peserta | NIK utuh | Disamarkan |
| Halaman pendaftaran akun | Pesan error menyebut NIK utuh & select anon dapat menelusuri data | Cek duplikat via RPC `app_check_registrasi` (hanya true/false) |

### Penegakan di sisi server (WAJIB dijalankan)

Jalankan **`sql/PATCH-PROFIL-OBSERVER-PRIVASI.sql`** di Supabase SQL Editor. Isinya:

- RPC `app_get_lulus_tes()` — data Lulus Tes publik TANPA kolom NIK/kontak
  (NIK tidak pernah keluar dari server).
- RPC `app_check_registrasi()` — cek duplikat pendaftaran tanpa membuka data orang lain.
- Grant kolom `akun_peserta`: NIK dihapus dari daftar kolom yang boleh dibaca anon
  (pendaftaran tetap bisa memasukkan NIK sendiri; yang diblokir adalah MEMBACA).

> Catatan: sebelum SQL dijalankan, aplikasi tetap aman tampil (kolom NIK sudah
> disaring di browser), namun penyaringan di SERVER hanya aktif setelah patch dijalankan.

---

## 2) SETIAP AKUN PESERTA DAPAT MENGEDIT PROFILNYA

Fitur baru — kartu **"Profil & Keamanan Akun"** pada dashboard peserta
(juga tersedia dari tombol "Edit Profil Akun" pada modal info akun):

- **Foto profil** — upload JPG/PNG/WebP maks 2 MB, preview langsung, tersimpan
  di Supabase Storage bucket `profil-foto`, tampil pada avatar dashboard.
- **Nama lengkap, username, email** — dapat disunting sendiri
  (username/evaluasi keunikan divalidasi server).
- **NIK** — hanya tampil disamarkan dan tidak dapat diubah sendiri
  (perubahan NIK tetap lewat admin/operator).
- **Password aktif** — peserta dapat mengganti passwordnya sendiri:
  wajib memasukkan password saat ini (diverifikasi server), password baru
  minimal 8 karakter; hash bcrypt dibuat di server dan semua sesi lain
  milik akun otomatis dicabut setelah ganti password.

Berkas terkait: `js/17-profil-peserta.js` (baru), RPC
`peserta_update_profile` & `peserta_change_password` di patch SQL,
kolom `akun_peserta.foto_url`.

---

## 3) ROLE BARU: OBSERVER (PENGMAT — LIHAT DATA SAJA)

Akun observer **hanya dapat MELIHAT** 3 bagian data panel admin:

- Data Pengusulan
- Data Roadmap
- Data Penetapan

**TIDAK BISA** mengunduh/ekspor, menambah, mengubah, menghapus —
tombol-tombol aksi disembunyikan otomatis, fungsi ekspor diblokir ganda
(di UI dan di sisi server RLS `write` tidak mengenali observer).

Yang disembunyikan dari observer: Dashboard, Data Akun Peserta,
laporan, pengaturan, portal peserta.

### Cara membuat akun observer

1. Lewat aplikasi: login superadmin → Panel Admin → "Daftar User Baru" →
   pilih peran **🔭 Observer/Pengamat (Lihat Data Saja)**.
2. Atau lewat SQL (template sudah tersedia di bagian akhir patch SQL —
   hapus tanda komentar dan sesuaikan username/password).

Perubahan terkait: `ROLE_CONFIG.observer` (js/02-auth-navigation.js),
permission matrix observer (js/12-multiuser-init.js), penambahan `data-action="export"`
pada 3 tombol export + guard `canExport` pada ketiga fungsi export,
penyembunyian tombol CRUD lightbox/kartu untuk role lihat-saja,
pengetatan halaman Data Penetapan & Data Akun Peserta (wajib login admin),
`app_is_valid_session` server mengenali `observer` (baca saja).

---

## 4) PEMBERESAN KECIL

- Label role `viewer` di topbar sebelumnya salah tampil "Peserta Beasiswa"
  → diperbaiki menjadi "Viewer (Baca Saja)".
- Redirect halaman role diubah ke ID halaman yang benar (`data-penetapan`).
- Grid kartu dashboard peserta disesuaikan untuk 4 kartu (responsif).

---

## CARA DEPLOY

1. Salin seluruh isi folder ini (timpa berkas lama) ke hosting.
2. **Wajib sekali**: jalankan `sql/PATCH-PROFIL-OBSERVER-PRIVASI.sql`
   di Supabase SQL Editor (aman dijalankan ulang).
3. Buat akun observer (lewatform "Daftar User Baru" atau template SQL).
4. Selesai — lakukan hard-refresh browser (Ctrl+F5) saat menguji.

## DAFTAR BERKAS YANG DIUBAH/DITAMBAH

| Berkas | Status |
|---|---|
| `js/01-core.js` | Diubah (helper `maskNik`, `canSeeFullNik`) |
| `js/02-auth-navigation.js` | Diubah (role observer, guard halaman, selector lihat-saja) |
| `js/03-admin-data.js` | Diubah (privasi NIK popup/kartu/fetch, guard export) |
| `js/04-form.js` | Diubah (mask NIK cek status) |
| `js/07-dashboard.js` | Diubah (sanitasi NIK modal dashboard) |
| `js/08-roadmap.js` | Diubah (guard export) |
| `js/09-cek-status.js` | Diubah (mask NIK hasil penetapan) |
| `js/10-admin-pengusul.js` | Diubah (guard export) |
| `js/11-topbar-session.js` | Diubah (mask NIK, foto avatar, sesi foto_url) |
| `js/12-multiuser-init.js` | Diubah (permission + label role observer/viewer) |
| `js/13-akun-peserta.js` | Diubah (gerbang role halaman Data Akun Peserta) |
| `js/15-bukti-pendaftaran.js` | Diubah (mask NIK bukti cetak) |
| `js/17-profil-peserta.js` | **Baru** (modul profil & keamanan akun peserta) |
| `index.html` | Diubah (kartu Profil Akun, data-action export, opsi observer, script tag) |
| `daftar-peserta.html` | Diubah (cek duplikat via RPC, pesan tanpa NIK utuh) |
| `css/ui-overhaul.css` | Diubah (grid 4 kartu dashboard peserta) |
| `sql/PATCH-PROFIL-OBSERVER-PRIVASI.sql` | **Baru** (patch database) |

---
---

# REVISI OPERATOR & UPLOAD FILE (Revisi Terbaru)

Tanggal: 8 Oktober 2026

Revisi ini mengerjakan 3 permintaan: (1) operator akses penuh 2 menu eksklusif,
(2) Rekomendasi Dinkes jadi upload file di Panel Admin, (3) form pengajuan &
form revisi peserta sepenuhnya upload file — dengan SQL Supabase yang dirapikan.

---

## 1) OPERATOR: AKSES PENUH DATA PENGUSULAN & DATA AKUN PESERTA — YANG LAIN DIBLOKIR

**Aturan baru:** menu **Data Pengusulan** dan **Data Akun Peserta** eksklusif
untuk **operator + superadmin**. Role lain (viewer, observer) TIDAK BOLEH
mengakses kedua menu tersebut (menu disembunyikan + halaman ditolak + aksi
CRUD diblokir).

### Yang diperbaiki (sebelumnya "hampir", tapi belum penuh & masih bocor)

| Titik | Sebelum | Sesudah |
|---|---|---|
| `js/02-auth-navigation.js` ROLE_CONFIG operator | `canApprove: false` | `canApprove: true` (akses penuh termasuk ubah status) |
| ROLE_CONFIG viewer | `dataPengusul: true, dataAkunPeserta: true` | Keduanya `false` — diblokir |
| ROLE_CONFIG observer | `dataPengusul: true` + **definisi duplikat 2x** | `dataPengusul: false` + duplikat dihapus (dirapikan) |
| `showPage('data-pengusul')` | TIDAK ada pengecekan permission → viewer/observer bisa membuka lewat JS | Masuk `protectedPages` → ditolak + otomatis kembali ke halaman yang diizinkan |
| Penolakan halaman | Halaman terlarang tetap aktif (bug tampilan) | Ditutup + redirect ke halaman fallback role terkait |
| `js/12-multiuser-init.js` getDefaultPermissions | observer `canAccessDataPengusul: true`; viewer tidak didefinisikan (jatuh ke default peserta) | observer `false`; entry `viewer` eksplisit |
| `js/admin-crud.js` openEditMode/openStatusMode/openDeleteMode | Tidak ada cek role (bergantung tombol tersembunyi saja) | Gerbang `canDoCrudOnPengusulan()`: hanya superadmin/operator/admin |
| **SERVER** RLS `submissions_delete_admin` | Hanya `superadmin` → tombol Hapus operator GAGAL | `app_is_valid_session('write')` → operator bisa hapus; viewer/observer tetap ditolak |
| **SERVER** RPC `admin_save_akun_peserta` | Hanya `superadmin/admin` → operator gagal tambah/edit akun | Termasuk `operator` |
| **SERVER** RPC `admin_delete_akun_peserta` | Hanya `superadmin/admin` → operator gagal hapus akun | Termasuk `operator` |

> 🗄️ **WAJIB dijalankan:** `sql/PATCH-OPERATOR-AKSES-PENUH.sql` di Supabase
> SQL Editor. Tanpa patch ini, operator menyandera 3 gerbang server di atas
> (hapus pengusulan, simpan akun, hapus akun) meski UI-nya sudah terbuka.

---

## 2) PANEL ADMIN > DATA PENGUSULAN > EDIT: "REKOMENDASI DINKES" = UPLOAD FILE

**Sebelum:** field `rekomendasi_dinkes` adalah input teks/URL biasa (admin
tempel link Google Drive manual).

**Sesudah (`js/admin-crud.js`):**
- Form edit menampilkan kartu khusus **"Rekomendasi Dinkes — Upload File"**:
  - Info "File saat ini" + tombol buka/unduh bila sudah ada.
  - Pemilih file **PDF/JPG/PNG/WEBP, maks 10 MB** + validasi instan
    (tipe, ukuran, file kosong) + preview thumbnail untuk gambar.
  - Opsi **"Hapus file rekomendasi saat ini"** (kosongkan kolom).
- Saat disimpan: file diupload otomatis ke Supabase Storage bucket
  `pengajuan-files` pada folder **`rekomendasi/<no_register>/`**, lalu URL
  publiknya otomatis tersimpan ke kolom `submissions.rekomendasi_dinkes`.
- File lama otomatis dihapus dari storage saat diganti (tidak menumpuk).
- Bila tidak memilih file baru & tidak mencentang hapus → kolom tidak diubah.
- Detail view tetap menampilkan tombol "Buka" untuk URL file.

---

## 3) PESERTA: FOTO & DOKUMEN KELENGKAPAN = UPLOAD FILE (SEMUA JALUR)

### a) Form "Ajukan Rekomendasi" (halaman utama)
Sudah mekanisme upload file (Task9f sebelumnya): foto ≤5 MB, dokumen
kelengkapan PDF gabungan ≤10 MB, surat pernyataan PDF ≤10 MB — upload
otomatis ke bucket `pengajuan-files`, URL tersimpan otomatis ke kolom
`foto_peserta` & `dokumen_kelengkapan`. **Tidak ada perubahan mekanisme.**

### b) Form Perbaikan/Revisi (Cek Status → status "Perbaikan") — DIGANTI TOTAL
**Sebelum:** dua kolom teks *"Paste link Google Drive"* (`rev-foto-link`,
`rev-dokumen-link`) — mekanisme lama yang tidak konsisten.

**Sesudah (`index.html` + `js/04-form.js` + `js/09-cek-status.js`):**
- **Foto Pasfoto → Upload File** (JPG/PNG/WEBP ≤5 MB) dengan thumbnail preview.
- **Dokumen Kelengkapan → Upload File** (PDF gabungan ≤10 MB).
- Tautan "File saat ini" ditampilkan sebagai info (tidak bisa diubah manual).
- Validasi instan memakai handler yang sama dengan form pengajuan utama
  (`handleFileSelected`) — pesan error konsisten.
- Saat disimpan: file diupload ke `pengajuan/<no_register>/revisi-foto-*` /
  `revisi-dokumen-*`, URL otomatis tersimpan ke kolom terkait.
- Bila tidak upload file baru → nilai lama **dipertahankan** (tidak terhapus).
- Upload dokumen baru HANYA mengganti URL dokumen; URL surat pernyataan
  yang tersimpan di kolom yang sama tetap aman.

---

## 4) SQL DIRAPIKAN: `sql/setup-storage-pengajuan.sql` (SATU SKRIP STORAGE)

Skrip storage lama ditulis ulang menjadi **satu skrip lengkap & idempotent**:

1. Bucket `pengajuan-files` (public, batas 10 MB/file) — dibuat/permak otomatis.
2. Policy baca publik (pratinjau & unduh).
3. Policy tulis (insert/update/**delete — BARU**) dibatasi ke folder aplikasi:
   `pengajuan/%` dan `rekomendasi/%`.
   - Policy DELETE sebelumnya TIDAK ADA → rollback upload gagal dan
     penggantian file rekomendasi menumpuk file yatim. Kini beres.
4. Panduan verifikasi + penjelasan folder penyimpanan.

> 🗄️ **Jalankan ulang sekali** `sql/setup-storage-pengajuan.sql` (aman
> dijalankan berulang) agar policy DELETE & pembatasan folder aktif.

### Ringkasan file yang berubah

| File | Perubahan |
|---|---|
| `js/02-auth-navigation.js` | ROLE_CONFIG (operator penuh, viewer/observer diblokir, duplikat observer dihapus), guard showPage data-pengusul, redirect halaman tolak akses |
| `js/12-multiuser-init.js` | getDefaultPermissions (entry viewer baru, observer false) |
| `js/admin-crud.js` | Field upload Rekomendasi Dinkes + upload ke storage + hapus file lama + guard role CRUD |
| `js/04-form.js` | handleFileSelected/clearSelectedFile mendukung kind `rev-foto`/`rev-dokumen` |
| `js/09-cek-status.js` | Form revisi: upload file + pertahankan nilai lama + render info file via DOM (anti-XSS) |
| `index.html` | Form revisi: input file menggantikan input link Google Drive |
| `sql/setup-storage-pengajuan.sql` | **Ditulis ulang** — skrip storage lengkap (bucket + 4 policy + folder) |
| `sql/PATCH-OPERATOR-AKSES-PENUH.sql` | **Baru** — patch server untuk akses penuh operator |

### Langkah pemasangan (urut)

1. Upload/replace file aplikasi (index.html, js/, css/) ke hosting.
2. Jalankan `sql/setup-storage-pengajuan.sql` di Supabase SQL Editor.
3. Jalankan `sql/PATCH-OPERATOR-AKSES-PENUH.sql` di Supabase SQL Editor.
4. Uji: login operator → cek 2 menu tampil & CRUD jalan (termasuk hapus);
   login viewer/observer → pastikan 2 menu hilang & halaman ditolak;
   edit data pengusulan → upload file Rekomendasi Dinkes; cek status
   pengajuan berstatus "Perbaikan" → perbaiki dengan upload foto/dokumen.
