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

---

# REVISI: TOMBOL "KEMBALI KE PORTAL" PADA 4 LAYANAN PESERTA

Tanggal: 14 Oktober 2026

## Permintaan

Pada Portal Peserta, setelah masuk ke salah satu pilihan kartu, sediakan
menu/tombol untuk **kembali ke Portal Peserta** di keempat layanan.

## Yang ditambahkan

Portal Peserta punya 4 kartu. Setiap kartu membuka layar layanan penuh
(popup/modal) yang sebelumnya hanya punya tombol "×" kecil tanpa label.
Kini setiap layar punya tombol jelas **"← Kembali ke Portal"**:

| Kartu | Layar tujuan | Tombol kembali |
|---|---|---|
| 1. Ajukan Rekomendasi | Popup `#peserta-ajukan-popup` | `← Kembali ke Portal` di topbar (dekat tombol ×) |
| 2. Cek Status Pengajuan | Popup `#peserta-cekstatus-popup` | `← Kembali ke Portal` di topbar |
| 3. Cek Status Penetapan | Popup `#peserta-penetapan-popup` | `← Kembali ke Portal` di topbar |
| 4. Profil & Keamanan Akun | Modal `#peserta-profil-modal` | `← Kembali ke Portal` di header hijau |

## Perilaku

- Klik tombol = menutup layar layanan dan kembali ke daftar kartu Portal
  Peserta (fungsi tutup yang sama dengan tombol × / tombol Batal, sehingga
  semua pembersihan state tetap berjalan — node form dikembalikan ke
  posisi aslinya, overflow body dipulihkan).
- Tombol × tetap ada; tombol Kembali hanyalah pintasan yang lebih jelas.
- **Responsif**: pada layar ≤ 640px label memendek otomatis menjadi
  "← Kembali" agar topbar tidak sempit; di header Profil, baris tombol
  turun rapi di bawah judul (flex-wrap).

## File yang berubah

| File | Perubahan |
|---|---|
| `index.html` | 3 topbar popup: tombol `.peserta-popup-back` + wadah `.peserta-popup-topbar-actions`; versi cache CSS/JS dinaikkan (`?v=20261014a`) |
| `js/17-profil-peserta.js` | Header modal profil: tombol `#profil-kembali-portal` + listener (klik = `closeProfilPeserta`, hover menerang) |
| `css/ui-overhaul.css` | Style baru `.peserta-popup-back`, `.peserta-popup-topbar-actions`, aturan responsif ≤640px |

Tidak ada perubahan SQL/Supabase untuk revisi ini (murni tampilan & navigasi).

---

# REVISI: KONFIRMASI SEBELUM KELUAR DARI FORM PENGAJUAN YANG SUDAH TERISI

Tanggal: 14 Oktober 2026

## Permintaan

Saat pengguna menutup form "Ajukan Rekomendasi" yang **sudah terisi**
(lewat tombol "← Kembali ke Portal", tombol ×, atau ESC), tampilkan
konfirmasi dulu agar data isian tidak hilang tanpa sengaja.

## Perilaku baru

| Kondisi form | Saat keluar dari popup |
|---|---|
| Kosong (hanya prefill otomatis NIK/nama/email/nomor register) | Langsung tertutup, **tanpa** konfirmasi |
| Sudah diisi pengguna (teks, pilihan, atau file terpilih) | Modal konfirmasi **"Keluar dari Formulir?"** |
| Pengajuan sudah berhasil terkirim (modal sukses tampil) | Langsung tertutup, tanpa konfirmasi |

Modal konfirmasi:
- **"Lanjut Mengisi"** (tombol abu) — kembali ke form, data tetap utuh.
  Klik di luar modal dan tombol ESC juga berperilaku sama (aman).
- **"Ya, Keluar"** (tombol merah) — menutup popup dan kembali ke Portal
  Peserta; data isian memang diabaikan.

Catatan teknis deteksi "sudah terisi": nilai field dibandingkan dengan
`defaultValue`/`defaultChecked` (nilai awal di HTML), sehingga prefill
otomatis dari sesi (NIK, nama, email) dan nomor register/tanggal yang
dibuat sistem **tidak** dianggap isian pengguna. File yang sudah dipilih
juga dihitung. Setelah pengajuan sukses, tanda `__ajukanSubmitted`
mencegah konfirmasi muncul lagi.

Jalur yang TIDAK diubah: setelah submit sukses, tombol "Cek Status
Pengajuan" pada modal sukses tetap langsung pindah tanpa konfirmasi.

## File yang berubah

| File | Perubahan |
|---|---|
| `js/11-topbar-session.js` | Fungsi baru `isAjukanFormDirty()`, `requestClosePesertaAjukan()`, `showAjukanExitConfirm()`, `closeAjukanExitConfirm()`; ESC popup ajukan lewat gerbang konfirmasi; tanda `__ajukanSubmitted` saat submit sukses |
| `index.html` | Tombol × dan "← Kembali ke Portal" popup ajukan memanggil `requestClosePesertaAjukan()`; versi cache `11-topbar-session.js` → `?v=20261014a` |

Tidak ada perubahan SQL/Supabase. Popup Cek Status & Penetapan tidak
memakai konfirmasi ini (formulirnya bukan isian panjang).

---

# REVISI: PENJAMINAN DATA PENGAJUAN TERSIMPAN + PEMULIHAN DATA HILANG

Tanggal: 14 Oktober 2026

## Latar (hasil penelusuran)

Keluhan: data & dokumen yang diinput lewat kartu **Ajukan Rekomendasi**
(akun peserta login) gagal tersimpan di tabel `submissions`, padahal
bukti daftar terbit.

Hasil audit alur kode (`04-form.js` → `05-database.js`):

1. Alur klien terbukti ketat: validasi ketat → 3 file diupload ke Storage
   → insert → verifikasi record → baru modal sukses → bukti terbit.
   Klien TIDAK mungkin menerbitkan bukti dari insert yang gagal.
2. Karena itu kehilangan data terjadi di sisi server; risiko konkret yang
   ditemukan:
   - **Kebijakan RLS `submissions` hanya `TO anon`.** Bila request membawa
     sesi auth lain, `.select()` setelah insert bisa mengembalikan KOSONG:
     row sebenarnya tercommit tapi aplikasi menganggap gagal (pengguna
     mengulang, status membingungkan), atau operasi ditolak total.
   - **File terupload duluan sebelum insert** → bila insert gagal, file
     jadi "yatim" di bucket `pengajuan-files` (data bisa dipulihkan!).
3. Dokumen yang sudah terupload tetap ada di Storage — sumber pemulihan.

## Solusi yang dipasang

### A. Jalur tulis dijamin server-side (root fix)
- **RPC baru `app_submit_pengajuan(payload, token)`** (security definer):
  insert ke `submissions` tanpa terpengaruh RLS drift; identitas
  NIK/nama/email peserta diambil dari sesi server (bukan percaya
  browser); **idempotent** — nomor register yang sudah ada dikembalikan
  tanpa duplikat (aman untuk kirim ulang).
- Klien (`05-database.js`): RPC dipakai dulu; bila belum terpasang,
  fallback ke insert langsung seperti semula — aplikasi tetap jalan
  sebelum SQL dijalankan.

### B. Antrean pemulihan otomatis (data hilang → kembali ke tabel)
- Bila seluruh jalur gagal, payload (termasuk URL file yang sudah
  terupload) disimpan ke `localStorage['simbakes_pending_submissions']`
  (maks 20) dan pengguna diberi tahu data AMAN.
- `retryPendingSubmissions()` otomatis berjalan saat: aplikasi dibuka
  (koneksi siap) dan portal peserta tampil. Berhasil → antrean bersih,
  toast notifikasi, daftar admin di-refresh.
- Sukses submit juga menghapus item antrean yang cocok.

### C. Pemulihan file yatim (panel admin)
- Tombol baru **"🛟 Pulihkan Data"** di header Data Pengusulan:
  memindai bucket `pengajuan-files`, menampilkan folder dokumen yang
  TIDAK punya baris di tabel, lengkap tautan filenya; satu klik
  **"Pulihkan ke Tabel"** membuat barisnya (no_register, tanggal,
  URL semua file). Admin melengkapi data teks (nama/NIK) lewat Edit Data
  dari bukti daftar pemohon.
- RPC pendukung: `admin_recover_pengajuan_storage()` (pindai,
  gate sesi admin 'write') dan `admin_restore_pengajuan_dari_storage(reg)`.

### D. RLS ditutup untuk semua role
- Kebijakan select/insert kini juga ada untuk `authenticated`
  (selain `anon` yang lama). Kebijakan admin update/delete tidak diubah.

## File yang berubah/ditambah

| File | Perubahan |
|---|---|
| `sql/PATCH-SUBMIT-PENGAJUAN.sql` | **Baru** — RPC submit + RLS authenticated + 2 RPC pemulihan + verifikasi |
| `js/05-database.js` | `submitCleanDataToSupabase()` (RPC→fallback→verifikasi), antrean pemulihan, `retryPendingSubmissions()` |
| `js/04-form.js` | Pesan "data AMAN" saat masuk antrean; bersihkan antrean saat sukses |
| `js/supabase-config.js` | Pemicu retry saat koneksi siap |
| `js/11-topbar-session.js` | Pemicu retry saat portal peserta tampil |
| `js/admin-crud.js` | Modul "🛟 Pulihkan Data" (modal pindai + pulihkan) |
| `index.html` | Tombol Pulihkan Data; versi cache 5 file JS → `?v=20261014b` |

## Langkah pemasangan (urut)

1. Upload/replace file aplikasi (index.html, js/) ke hosting.
2. Jalankan **`sql/PATCH-SUBMIT-PENGAJUAN.sql`** di Supabase SQL Editor
   (aman berulang). Wajib agar jalur RPC & pemulihan aktif.
3. Uji:
   - Submit pengajuan dari akun peserta → cek tabel submissions →
     baris lengkap termasuk URL file.
   - Panel admin → Data Pengusulan → "🛟 Pulihkan Data" → bila ada file
     yatim (misal dari kejadian hilang sebelumnya), klik "Pulihkan ke
     Tabel" → baris muncul → Edit Data untuk melengkapi nama/NIK.
   - Di perangkat peserta yang pernah gagal kirim: buka ulang situs →
     toast "Pengajuan tertunda berhasil dikirim" → data masuk tabel.

> Catatan diagnosa: bila bukti daftar terbit tetapi baris tidak ada di
> tabel, kemungkinan barisnya pernah tercommit lalu terhapus manual/SQL
> reset, atau bukti dicetak dari hasil Cek Status lama. File dokumennya
> tetap aman di Storage — gunakan "🛟 Pulihkan Data" untuk mengembalikan
> barisnya, atau minta peserta membuka ulang situs (antrean otomatis
> mengirim ulang bila tersimpan di perangkatnya).

---

# HASIL PENELUSURAN AKAR MASALAH — DATA PENGAJUAN GAGAL TERSIMPAN
## (Revisi 14 Okt b) Penyebab pasti: database Supabase terkunci MODE BACA-SAJA

## Temuan

Gejala yang dilaporkan — "data & dokumen dari form Ajukan Rekomendasi gagal
tersimpan di tabel `submissions`, sementara bukti daftar tetap terbit" —
**bukan bug kode aplikasi**. Alur simpan di klien sudah benar dan ketat:
validasi → upload 3 file ke Storage → INSERT ke `submissions` melalui RPC →
verifikasi baris → baru modal sukses + bukti. Bukti tidak mungkin terbit
dari INSERT yang gagal di klien.

Penyebab sesungguhnya ditemukan dari pesan error server:

```
cannot execute UPDATE in a read-only transaction  (SQLSTATE 25006 / HTTP 405)
```

Supabase **otomatis mengunci database menjadi baca-saja** saat pemakaian disk
mendekati batas kuota (~95%). Akibatnya:

| Operasi | Status saat read-only |
|---|---|
| Upload file dokumen ke Storage | ✅ Berhasil (di luar database) |
| INSERT/UPDATE baris ke tabel `submissions` | ❌ Ditolak server (25006) |
| SELECT / tampilan daftar / login | ✅ Normal |
| Bukti daftar (dibuat di browser dari isian form) | ✅ Tetap terbit — inilah yang membuat kesannya "berhasil" |

**Tidak ada data yang hilang permanen:**
1. **File dokumen** tetap utuh di bucket Storage (`pengajuan-files`) —
   dapat dikembalikan ke tabel lewat tombol admin **"🛟 Pulihkan Data"**.
2. **Isian form** di perangkat pelapor tersimpan di **antrean pemulihan
   otomatis** (localStorage) dan **terkirim sendiri** begitu database normal.

## Perbaikan yang ditambahkan (Revisi 14 Okt b)

| File | Perubahan |
|---|---|
| `sql/DIAG-READ-ONLY.sql` | **Baru** — skrip diagnostik (aman dijalankan walau read-only): cek status read-only, pemakaian disk, tabel/storage terbesar, pembersihan aman, langkah membebaskan kuota |
| `js/supabase-config.js` | Deteksi `simbakesIsDbReadOnly()` (25006 / HTTP 405 / pesan read-only) + pesan ramah khusus |
| `js/04-form.js` | Pesan gagal-kirim khusus read-only: "Data Anda AMAN — server baca-saja, otomatis terkirim setelah kuota normal" |
| `js/05-database.js` | Tandai `error.dbReadOnly` saat antrean dibuat agar pesan form tepat |
| `js/admin-crud.js` | Modal "🛟 Pulihkan Data" memberi panduan bebas-kuota saat read-only; **perbaikan bug hover baris admin** (SyntaxError `Unexpected token ':'` di console akibat atribut onmouseenter lama tidak valid) |
| `js/13-akun-peserta.js` | Client cadangan di-cache — menghilangkan warning "Multiple GoTrueClient instances detected" |
| `index.html` | Versi cache 6 file → `?v=20261014c` |

## Yang harus dilakukan admin (sekali, di Dashboard Supabase)

1. Jalankan **`sql/DIAG-READ-ONLY.sql`** di SQL Editor → lihat hasil butir 1 & 2
   (status read-only + pemakaian disk).
2. Bebaskan kuota di **Dashboard** (bukan lewat SQL):
   hapus backup/data lama yang tak terpakai, bersihkan sesi kadaluarsa
   (`select public.app_purge_expired_sessions();`), hapus file Storage tak
   terpakai, atau upgrade paket.
3. Tunggu 1–5 menit sampai banner "read-only" di Dashboard hilang sendiri.
4. Muat ulang SIMBAKES:
   - Pengajuan tertunda di perangkat peserta **terkirim otomatis** (toast
     "Pengajuan tertunda berhasil dikirim"),
   - File yatim dari kejadian sebelumnya dipulihkan lewat **"🛟 Pulihkan Data"**
     di panel admin → Data Pengusulan.
