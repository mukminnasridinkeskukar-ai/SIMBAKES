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

---

# REVISI 15 OKT — PENYIMPANAN FILE KE CLOUDFLARE R2 (DATABASE TETAP SUPABASE)

## Ringkasan

File dokumen/foto (foto pasfoto, dokumen kelengkapan, surat pernyataan,
rekomendasi dinkes, foto profil) kini dapat diupload ke **Cloudflare R2**
(gratis 10 GB + traffic unduh gratis), sementara **database tetap 100%
Supabase** — tanpa perubahan tabel, tanpa SQL baru, tanpa migrasi data.
File lama yang sudah ada di Supabase Storage tetap tampil normal.

## File baru / berubah

| File | Keterangan |
|---|---|
| `js/r2-config.js` | **Baru** — driver R2: konfigurasi 4 baris, upload/hapus/ekstrak-URL, saklar `enabled` (false = mode Supabase seperti biasa) |
| `cloudflare/worker-simbakes-upload.js` | **Baru** — kode Worker Cloudflare (tempel di dashboard; endpoint upload/delete/list/health, token, whitelist folder & tipe, maks 10 MB, anti-path-traversal) |
| `cloudflare/migrate-supabase-to-r2.mjs` | **Baru (opsional)** — skrip Node memindahkan file lama Supabase → R2 + mencetak SQL pengganti URL |
| `README-CLOUDFLARE-R2.md` | **Baru** — panduan pemasangan lengkap (±20 menit, semua lewat dashboard, tanpa CLI) |
| `js/04-form.js` | `uploadFileToStorage()` otomatis memilih driver R2 bila aktif; rollback file sisa upload mendukung R2 |
| `js/admin-crud.js` | Upload rekomendasi dinkes mendukung R2; hapus file lama mendukung URL R2 & URL Supabase sekaligus |
| `js/17-profil-peserta.js` | Foto profil mendukung R2 (penyimpanan profil tetap via RPC Supabase) |
| `index.html` | Muat `r2-config.js` sebelum admin-crud; versi cache 3 file → `?v=20261015a` |

## Yang perlu dilakukan pengguna

1. Ikuti **README-CLOUDFLARE-R2.md** (buat bucket R2 + Worker + isi
   `js/r2-config.js`).
2. Tidak ingin pindah? Abaikan saja — `enabled: false` membuat aplikasi
   berperilaku persis seperti sebelumnya (default).

## QA

- `node --check` lulus untuk semua file yang berubah + Worker + skrip migrasi.
- Uji RBAC 18 kasus lulus (tidak ada perubahan hak akses).
- Uji logika driver: 19 kasus (gate, sanitasi path/anti-`..`, ekstrak URL,
  upload sukses/401/413/ekstensi/jaringan, delete via URL).
- Uji integrasi `uploadFileToStorage`: R2 nonaktif → Supabase terpanggil,
  Worker tidak; R2 aktif → Worker terpanggil, Supabase tidak (6 kasus lulus).

---

# REVISI 15 OKT b — JALUR TANPA KARTU KREDIT: BACKBLAZE B2

## Latar

Aktivasi Cloudflare R2 meminta data pembayaran (kartu) walau paketnya
gratis — pengguna terhalang di langkah itu. Solusi: Worker yang sama kini
mendukung **Backblaze B2** sebagai backend penyimpanan file (10 GB gratis,
pendaftaran **tanpa kartu kredit**, unduhan gratis s.d. 3× kapasitas/bulan).
Database tetap 100% Supabase; kode aplikasi & konfigurasi `r2-config.js`
TIDAK berubah sama sekali.

## Perubahan

| File | Keterangan |
|---|---|
| `cloudflare/worker-simbakes-upload.js` | Kini mendukung 2 backend via variable `STORAGE_BACKEND`: `b2` (default baru yang direkomendasikan untuk pengguna tanpa kartu) dan `r2`. Backend B2 memakai native API B2 (authorize + get_upload_url di-cache 23 jam, checksum SHA-1 via Web Crypto, retry token expired, duplikat → 409, URL publik dari downloadUrl hasil authorize — bukan hardcode) |
| `README-BACKBLAZE-B2.md` | **Baru** — panduan lengkap tanpa kartu: daftar B2 → bucket Public → App Key → URL baca publik → Worker (tanpa kartu) → isi variable → konfigurasi 4 baris → uji |
| `README-CLOUDFLARE-R2.md` | Ditambah petunjuk ke jalur B2 di bagian atas |
| `js/r2-config.js` | Hanya komentar diperbarui (kontrak konfigurasi identik untuk R2 & B2) |

## QA

- Uji Worker (Node, mock API B2): 14/14 lulus — /health, 401, urutan
  authorize→get_upload_url→upload, header X-Bz-File-Name & SHA-1 cocok,
  cache token antar-request, duplicate→409, delete via list+delete_file_version,
  list terpetakan, petunjuk konfigurasi, whitelist prefix.
- Uji r2-config 19/19, uji integrasi driver 6/6, RBAC lulus, node --check lulus.

---

# REVISI 15 OKT c — PENGAKUAN FAKTA: R2 SELALU MINTA KARTU + PENGAMAN JEBAKAN DAFTAR BACKBLAZE

## Latar

Pengguna melaporkan *"tetap diminta bayaran"* setelah mencoba beberapa
kali. Telusuran & verifikasi (dokumentasi resmi Backblaze + forum resmi
Cloudflare, 15 Okt) mengonfirmasi:

1. **Cloudflare R2 wajib kartu kredit/debit untuk aktivasi — tanpa
   kecuali, termasuk kuota gratis 10 GB.** R2 adalah layanan *metered*
   (pemakaian tak dibatasi, ditagih bila melewati kuota), sehingga
   Cloudflare selalu meminta metode pembayaran saat menekan
   "Purchase R2". **Tidak ada cara mengaktifkan R2 tanpa kartu.**
   Jangan mencoba ulang — hasilnya pasti sama.
2. **Backblaze B2 resmi "No credit card required"** untuk 10 GB gratis.
   Jebakan yang paling mungkin terjadi: halaman depan Backblaze
   menonjolkan produk **"Computer Backup" (~$9/bulan, berbayar)** —
   mendaftar di produk itu memang diminta pembayaran, padahal yang
   dibutuhkan SIMBAKES adalah produk **B2 Cloud Storage** (gratis).

## Perubahan (hanya dokumentasi — kode aplikasi tidak tersentuh)

| File | Keterangan |
|---|---|
| `README-CLOUDFLARE-R2.md` | Peringatan besar di bagian atas: R2 TIDAK BISA diaktifkan tanpa kartu (kebijakan Cloudflare) — jangan ulangi mencoba; arahkan ke jalur B2 / mode Supabase murni. Langkah 1 diberi catatan tepat di titik permintaan kartu |
| `README-BACKBLAZE-B2.md` | Bagian baru di paling atas: "MASIH DIMINTA PEMBAYARAN? Periksa 3 hal ini" — (1) tabel pembeda produk Computer Backup (berbayar ❌) vs B2 Cloud Storage (gratis ✅) + tautan pendaftaran yang tepat `backblaze.com/sign-up/cloud-storage`; (2) abaikan banner upgrade di dashboard B2; (3) jangan campuri panduan R2. Langkah 1 ditulis ulang memakai tautan pendaftaran langsung |

## Keputusan untuk pengguna tanpa kartu

| Pilihan | Yang dilakukan |
|---|---|
| **A. Jalur B2 (disarankan bila ingin kapasitas file besar)** | Ikuti `README-BACKBLAZE-B2.md` mulai dari tautan pendaftaran yang benar — tanpa kartu dari awal sampai akhir |
| **B. Tetap Supabase murni (tanpa layanan baru sama sekali)** | Biarkan `js/r2-config.js` → `enabled: false` (kondisi default sekarang). Aplikasi 100% berfungsi; bila database terkunci baca-saja, jalankan `sql/DIAG-READ-ONLY.sql` lalu bebaskan kuota via Dashboard |
| **C. R2 (hanya bila ada kartu)** | Ikuti `README-CLOUDFLARE-R2.md`; kuota gratis tidak ditagih selama tidak terlampaui |

---

# REVISI 15 OKT d — AUDIT PENUH JALUR SUBMISI + SQL PEMELIHARAAN KUOTA

## Latar

Setelah pengguna memastikan kuota Supabase masih sangat lega
(Database 6%, Storage 3% — screenshot Usage 15 Okt), keputusan final:
**tetap 100% Supabase**. Atas permintaan pengguna — *"buatkan dan
rapikan kembali seluruhnya agar data yang terinput bisa masuk ke tabel
submissions dengan lancar"* — dilakukan audit menyeluruh jalur simpan
dan dibuatkan SQL pemeliharaan berkala.

## Hasil audit jalur submit (kesimpulan: SEHAT, tidak ada bug penghalang)

| Titik | Hasil pemeriksaan |
|---|---|
| `04-form.js` submitForm | ✅ Guard klik-ganda, validasi ulang seluruh isian, nomor register dijamin unik, 3 file diupload dengan pembersihan sisa bila gagal, hasil insert diverifikasi eksplisit sebelum modal sukses |
| `04-form.js` uploadFileToStorage | ✅ Gerbang R2 dinonaktifkan dengan benar (default Supabase); pesan error upload dipetakan ramah (bucket belum ada / RLS / jaringan) |
| `05-database.js` submitCleanDataToSupabase | ✅ Jalur 1 RPC `app_submit_pengajuan` (security definer, idempotent, identitas peserta distempel server) → Jalur 2 insert langsung bila RPC belum terpasang → tangani duplikat 23505 → verifikasi row terbaca |
| Antrean pemulihan | ✅ Payload gagal kirim disimpan perangkat (maks 20, unik per nomor); kirim ulang otomatis saat koneksi siap & portal dibuka; dihapus dari antrean hanya setelah terverifikasi tersimpan |
| Deteksi baca-saja | ✅ SQLSTATE 25006 / HTTP 405 / "read-only transaction" → pesan khusus "data Anda AMAN, server baca-saja" |
| Server (PATCH-SUBMIT-PENGAJUAN.sql) | ✅ RPC submit + RLS select/insert `authenticated` + RPC pemulihan file yatim — semua idempotent |
| Pemetaan payload | ✅ Whitelist kolom bersih; tanggal dinormalisasi ISO (termasuk format Indonesia "16 Agustus 2026"); kolom tak dikenal tidak ikut terkirim |

## Perubahan

| File | Keterangan |
|---|---|
| `sql/CLEANUP-QUOTA.sql` | **Baru** — pemeliharaan berkala 1 menit: (A) laporan read-only/ukuran DB/tabel terbesar+baris mati/Storage/sesi; (B) hapus HANYA sesi login mati (kadaluarsa & dicabut — predikat sama dengan `app_purge_expired_sessions`) dengan pengaman otomatis bila database masih read-only; (C) daftar kandidat file yatim Storage TANPA menghapus (diarahkan ke tombol "🛟 Pulihkan Data" dulu); (D) instruksi `VACUUM (analyze)` yang sengaja dijalankan terpisah (VACUUM tidak boleh dalam transaksi). Idempotent, aman diulang, tidak pernah menyentuh submissions/akun_peserta |
| `js/05-database.js` | Pengirim-ulang BERKALA: selama halaman terbuka dan masih ada pengajuan tertunda, coba kirim ulang tiap 2 menit — pengajuan masuk ke `submissions` segera setelah server normal, tanpa perlu buka-tutup halaman (no-op saat antrean kosong; antre-tabungan dijamin `__pendingSyncBusy`) |
| `index.html` | Cache-bust `05-database.js` → `?v=20261015c` |

## Langkah admin (opsional tapi disarankan)

1. Jalankan `sql/CLEANUP-QUOTA.sql` di SQL Editor (aman, 1 menit) —
   rutinkan 1–2 minggu sekali atau saat Usage → Database Size > 60%.
2. Ikuti instruksi Bagian D di skrip itu: jalankan `vacuum (analyze)
   public.app_sessions;` di tab Run terpisah bila pembersihan menghapus
   baris (agar ruang disk benar-benar bebas).
3. Tidak ada SQL wajib baru untuk jalur submit — PATCH-SUBMIT-PENGAJUAN.sql
   yang sudah pernah dijalankan tetap berlaku.

---

# REVISI 15 OKT e — SUPERADMIN DAPAT MELIHAT USERNAME & PASSWORD ASLI AKUN PESERTA

## Latar

Permintaan pengguna: *"akun superadmin dapat melihat username dan password
akun peserta, pastikan password yang digunakan oleh peserta atau diubah
peserta bisa tampil (bukan hash nya)"*.

Sejak SECURITY-HARDENING.sql, password peserta disimpan sebagai **hash
bcrypt** dan plaintext dibuang — hash bcrypt sengaja TIDAK BISA dibalik,
sehingga password lama mustahil ditampilkan. Solusinya: password kini
**dicatat juga** (kolom baru `password_visible`) di 4 titik otomatis,
lalu ditampilkan khusus untuk Superadmin.

## Cara kerja (4 titik perekaman otomatis — tanpa reset password)

| Titik | Kapan password terekam |
|---|---|
| Registrasi publik (daftar-peserta.html) | Langsung saat pendaftaran (trigger server) |
| Login peserta | Saat peserta mengetik password yang benar — akun LAMA otomatis terekam pada login pertama setelah patch |
| Admin tambah/ubah akun | Saat superadmin/admin mengisi kolom password di modal Tambah/Edit Akun |
| Peserta ganti password sendiri | Saat mengganti lewat kartu Profil & Keamanan Akun |

> Akun lama yang belum login lagi akan berstatus **"- (belum terekam)"**.
> Superadmin tinggal menunggu peserta login sekali lagi (otomatis terekam),
> atau langsung mengatur password baru lewat ✏️ Edit Akun.

## Perubahan

| File | Keterangan |
|---|---|
| `sql/PATCH-PASSWORD-LIHAT-SUPERADMIN.sql` | **Baru (WAJIB)** — kolom `password_visible`; trigger registrasi kini mencatat plaintext sebelum hash; backfill akun legacy yang masih plaintext; `app_peserta_login` + pencatatan; `admin_save_akun_peserta` + pencatatan; `peserta_change_password` + pencatatan; RPC baru **`superadmin_list_password_akun_peserta`** yang MENOLAK semua role selain superadmin di server. Verifikasi login TETAP memakai bcrypt (tidak berubah) |
| `js/13-akun-peserta.js` | Kolom **🔑 Password** di tabel Data Akun Peserta (HANYA saat login sebagai superadmin — kolom hilang otomatis untuk admin/operator/viewer); tombol 👁 tampil/sembunyikan per baris; tombol 📋 salin ke clipboard (dengan fallback); baris "- (belum terekam)" + tooltip penjelasan; modal Edit Akun menampilkan "Password saat ini" bagi superadmin; hint penjelasan di bawah toolbar; colspan tabel dinamis 7↔8 |
| `index.html` | Cache-bust `13-akun-peserta.js` → `?v=20261015d` |

## Keamanan (penting dibaca superadmin)

- Kolom `password_visible` **tidak diberi grant ke anon** — tidak mungkin
  dibaca langsung dari tabel; satu-satunya pintu adalah RPC yang memvalidasi
  role superadmin di server (admin/operator/peserta ditolak).
- Uji otomatis membuktikan: operator/admin TIDAK memanggil RPC password dan
  password tidak pernah tampil di tabel untuk mereka (35/35 PASS, termasuk
  kasus "RPC belum terpasang" dan deteksi role).
- ⚠️ **Risiko yang disadari**: superadmin kini dapat membaca password peserta.
  Karena itu JANGAN gunakan password yang sama dengan akun penting lain
  (email/medsos) di sistem ini, dan batasi siapa yang memegang akun superadmin.
  Ini keputusan kepemilikan sistem — fitur dibuat sesuai permintaan, dengan
  penjelasan risiko di sini.

## Langkah admin (WAJIB, ±1 menit)

1. Buka Supabase Dashboard → SQL Editor → jalankan
   **`sql/PATCH-PASSWORD-LIHAT-SUPERADMIN.sql`** (idempotent, aman diulang).
2. Refresh halaman SIMBAKES (F5 / Ctrl+F5), login sebagai **superadmin**,
   buka menu **Data Akun Peserta** → kolom 🔑 Password muncul.
3. Selesai. Tidak ada konfigurasi lain.

## Hasil pengujian

| Uji | Hasil |
|---|---|
| `scripts/test-password-visibility.js` (baru) | 35/35 PASS — deteksi role, RPC hanya superadmin, render kolom, toggle 👁, salin 📋, PGRST202 fallback, 9 cek statis SQL |
| `test-rbac-simbakes.js` (regresi) | SEMUA LULUS |
| `test-r2-config.js` (regresi) | 19/19 PASS |
| `test-r2-driver-switch.js` (regresi) | 6/6 PASS |
| `test-worker-b2.mjs` (regresi) | 14/14 PASS |
| `node --check` seluruh JS tersentuh | LULUS |

---

# REVISI 15 OKT f — SIMPAN FOTO PROFIL TERSENDIRI (TOMBOL SENDIRI, TANPA PASSWORD)

## Permintaan

> "penyimpanan foto profil tidak tersedia tombol simpannya. terlihat tombol
> simpan paling bawah apabila password juga diubah. pastikan perubahan atau
> upload foto profil dapat di simpan tersendiri."

## Penyebab (hasil pemeriksaan)

Modal "👤 Profil & Keamanan Akun" hanya punya SATU tombol simpan di paling
bawah. Foto yang dipilih baru "menunggu" di browser (`fotoState`) dan baru
terkirim ketika tombol bawah itu ditekan — sehingga pengguna merasa foto
tidak bisa disimpan sendiri dan "tergantung" pada perubahan password.

## Solusi

Tombol **💾 Simpan Foto** ditambahkan langsung di area foto (sejajar
"📷 Pilih Foto" & "🗑️ Hapus Foto"):

| Perilaku baru | Keterangan |
|---|---|
| Nonaktif saat belum ada perubahan | Redup + tooltip "Pilih atau ubah foto terlebih dahulu" |
| Aktif otomatis | Begitu foto dipilih ATAU foto ditandai hapus |
| Simpan HANYA foto | RPC `peserta_update_profile` dikirim dengan `{id, foto_url}` saja — server (COALESCE) mempertahankan nama/username/email; password tidak tersentuh |
| Modal tetap terbuka | Bisa lanjut menyunting data lain; avatar di topbar ikut terbarui |
| File foto lama dibereskan | Best-effort hapus file lama (R2/B2 via Worker; Supabase diabaikan aman — dipantau CLEANUP-QUOTA.sql) |
| Anti simpan-ganda | Selama upload/simpan berjalan, tombol foto & "Simpan Perubahan" saling mengunci |

Tombol bawah **"💾 Simpan Perubahan"** tetap berfungsi seperti semula untuk
menyimpan gabungan (data profil + foto + ganti password) sekali klik.

## File yang berubah

| File | Perubahan |
|---|---|
| `js/17-profil-peserta.js` | Tombol `#profil-foto-simpan` + state bersama `fotoState`; fungsi baru `simpanFotoProfilSaja()`, `uploadFotoProfil()` (helper bersama), `bersihkanFotoLama()` (best-effort); `simpanProfil()` kini memakai helper yang sama + gerbang antre `dataset.busy`; hint foto diperbarui |
| `index.html` | Cache-bust `17-profil-peserta.js` → `?v=20261015f` |

Tidak ada perubahan SQL/tabel/Supabase — murni perilaku halaman profil.

## Hasil pengujian

| Uji | Hasil |
|---|---|
| `scripts/test-profil-foto-mandiri.js` (baru) | **52/52 PASS** — tombol nonaktif/aktif, RPC tepat `{id, foto_url}`, hapus foto, hapus tanpa foto, simpan gabungan tetap jalan, antrean klik-ganda, PGRST202, driver R2 |
| Uji browser nyata (harness) | Tombol redup → aktif saat pilih foto → klik → sukses, RPC tercatat benar, modal tetap terbuka; mobile 375px rapi |
| Regresi: RBAC / r2-config / driver-switch / password-visibility / worker-b2 | SEMUA LULUS (18, 19, 6, 35, 14) |
| `node --check` | LULUS |

## Langkah admin

Tidak ada yang perlu dijalankan — cukup **refresh halaman** (Ctrl+F5) agar
file JS baru terload.

---

# REVISI 15 OKT g — KARTU BIODATA (VIEW-ONLY) + AJUKAN HANYA SEKALI PER NIK

## Permintaan

> "1. tambahkan kartu disebelah Ajukan Formulir dengan nama Biodata.
> 2. kartu biodata akan menampilkan seluruh data pribadi peserta yang sama
>    dengan data yang ada di menu data pengajuan, dengan tampilan data yang
>    sangat cantik, tetapi semuanya hanya bisa dilihat (view) saja oleh peserta.
> 3. kartu ajukan formulir hanya bisa diisi satu kali oleh peserta (pastikan
>    ada notifikasi di bagian NIK bahwa data sudah pernah diinput)."

## 1) Kartu Biodata (tepat di sebelah kartu Ajukan Rekomendasi)

Portal Peserta kini punya 5 kartu: **Ajukan Rekomendasi → 🪪 Biodata → Cek
Status Pengajuan → Cek Status Penetapan → Profil & Keamanan Akun** (grid
desktop diubah 4→3 kolom agar tersusun seimbang 3+2).

Isi halaman Biodata (dari tabel `submissions` — sama persis dengan menu
Data Pengajuan, hanya TAMPIL):

| Bagian | Isi |
|---|---|
| Hero hijau | Foto pasfoto, nama, chip NIK, chip No. Register, badge status, tanggal pengajuan |
| 🧑 Data Pribadi | NIK, nama lengkap, tempat/tanggal lahir, alamat KTP, alamat domisili, lama domisili |
| 💼 Data Pekerjaan | Pekerjaan, posisi, unit kerja, penjelasan/narasi |
| 🎓 Rencana Studi | Jurusan tujuan, jenjang, unit tujuan, tahun studi |
| 📞 Kontak | HP, WhatsApp, email |
| 📎 Dokumen Terlampir | Tombol buka: Foto Pasfoto / Dokumen Kelengkapan (PDF) / Rekomendasi Dinkes |

Belum ada pengajuan → tampil empty state ramah. Footer: catatan view-only.
Sumber data: RPC `peserta_get_biodata(p_token)` — sesi divalidasi server,
peserta hanya dapat melihat biodatanya SENDIRI (fallback baca langsung bila
RPC belum terpasang).

## 2) Ajukan Formulir hanya sekali per peserta

| Lapisan | Perilaku |
|---|---|
| Buka form (login peserta) | NIK sesi dicek otomatis → bila sudah ada pengajuan: **notifikasi hijau tepat di bawah isian NIK** ("✅ Data dengan NIK ini sudah pernah diinput — No. Register ...") + tombol Kirim diblokir |
| Saat mengetik NIK | Cek otomatis saat 16 digit lengkap (juga untuk jalur publik) |
| Klik Kirim | Ditahan di `handleFormSubmit` & `submitForm` dengan peringatan |
| Server (final) | `app_submit_pengajuan` menolak NIK yang sudah punya pengajuan dengan nomor register BERBEDA — kirim-ulang antrean (nomor SAMA) tetap lolos lewat jalur idempotent |

## File yang berubah

| File | Perubahan |
|---|---|
| `index.html` | Kartu Biodata baru (amber) setelah kartu Ajukan + muat `18-biodata-peserta.js` + cache-bust (ui-overhaul.css, 04-form.js, 11-topbar-session.js → v=20261015g) |
| `js/18-biodata-peserta.js` (BARU) | Popup Biodata full-screen (Kembali ke Portal + ×, ESC), render cantik view-only, RPC + fallback, empty state |
| `js/04-form.js` | Cek NIK otomatis (buka form + saat mengetik), notifikasi di bawah NIK, blokir Kirim 2 lapis, state terpasang otomatis setelah sukses kirim |
| `js/11-topbar-session.js` | `openPesertaAjukan()` memanggil `pesertaAjukanGuard()`; ESC menutup popup Biodata |
| `css/ui-overhaul.css` | Grid kartu portal 4→3 kolom (5 kartu) |
| `sql/PATCH-BIODATA-AJUKAN-SEKALI.sql` (BARU) | RPC `peserta_get_biodata` + penjaga "satu NIK satu pengajuan" di `app_submit_pengajuan` (idempotent, tanpa ubah skema) |

## Langkah admin (WAJIB, ±1 menit)

1. Supabase Dashboard → SQL Editor → jalankan
   **`sql/PATCH-BIODATA-AJUKAN-SEKALI.sql`** (idempotent, aman diulang).
2. Upload file revisi ini + refresh halaman (Ctrl+F5).

## Hasil pengujian

| Uji | Hasil |
|---|---|
| `scripts/test-biodata-ajukan.js` (baru) | **34/34 PASS** — popup, RPC + fallback + empty state + error, semua bagian data, view-only murni, notifikasi NIK, blokir 2 lapis, listener 16 digit, ESC & guard |
| Uji browser nyata (harness) | Biodata desktop cantik, NIK notice + tombol terblokir, kartu 3+2 desktop & mobile rapi |
| Regresi: RBAC / r2-config / driver-switch / password / foto-profil / worker-b2 | SEMUA LULUS (18, 19, 6, 35, 52, 14) |
| `node --check` semua JS tersentuh | LULUS |

---

# REVISI 15 OKT h — Kerapian CRUD Admin/Operator + Tombol "Tambah Data" Data Penetapan

## Latar belakang (laporan pengguna)

> 1. cek dan rapikan kemampuan admin dan operator pada menu data pengajuan — pastikan setiap bagian CRUD lancar; penyimpanan setelah edit harus berhasil mengubah data di Supabase; data yang diubah di beberapa bagian seharusnya tersimpan sekaligus.
> 2. pastikan perubahan data di menu lainnya oleh admin/operator lancar.
> 3. tambahkan tombol tambah data di menu data penetapan, pastikan tersimpan baik di Supabase.

## Hasil audit

| Bagian | Temuan | Tindakan |
|---|---|---|
| Data Pengusulan — EDIT (lightbox) | Alur simpan sudah benar: FormData mengumpulkan SEMUA field lalu **satu perintah UPDATE** (kolom dikosongkan → null). Tapi ada 2 cacat: (a) **dropdown Status tidak memuat `Pending`/`Batal`** — record berstatus itu otomatis terpilih `Draft` saat form edit dibuka, dan SIMPAN mengubah status tanpa disadari; (b) tidak ada penahan klik-ganda saat proses simpan (upload rekomendasi lambat → dobel submit) | (a) daftar status disamakan dengan status resmi aplikasi + nilai lama apapun tetap ditampilkan; (b) gerbang `isSaving` |
| Data Pengusulan — TAMBAH/HAPUS/STATUS | Sudah sehat (kolom valid, guard cukup) | — |
| Data Akun Peserta | Sudah sehat: RPC `admin_save_akun_peserta` + fallback RLS + pesan ramah | — |
| Data Roadmap / Penetapan EDIT/HAPUS | Sudah sehat (fallback kolom catatan & constraint status sudah ada) | — |
| Data Penetapan — TAMBAH | **Tombol TIDAK ADA**; modal add (belum tersambung) memakai nama kolom yang TIDAK ada di tabel (`jurusan_tujuan`, `jenjang_pendidikan`, `unit_kerja`) dan status `Proses` yang DITOLAK constraint DB → INSERT pasti gagal | Tombol ➕ Tambah Data dibuat + modal & payload ditulis ulang memakai kolom sebenarnya |

## Perubahan

| File | Perubahan |
|---|---|
| `js/admin-crud.js` | Dropdown Status form edit: daftar resmi (`Proses Verifikasi/Disetujui/Ditolak/Perbaikan/Batal/Pending`) + nilai legacy apapun tetap muncul & terpilih (status TIDAK pernah berubah sendiri); gerbang anti klik-ganda `lightboxState.isSaving` di `handleEditSubmit` |
| `js/03-admin-data.js` | `openPenetapanAddModal` ditulis ulang: field = kolom tabel penetapan (nama*, nik*, no_register, jurusan*, jenjang (datalist), perguruan tinggi, unit pendayaguna, pekerjaan, tempat/tanggal lahir, tanggal penetapan, status (5 nilai constraint), link foto, link SK, catatan); `saveNewPenetapan` baru: validasi NIK 16 digit, guard klik-ganda, kolom kosong tak dikirim, catatan hanya saat terisi (+lewati bila kolom belum ada), **fallback otomatis PGRST204** ke nama kolom alternatif, pesan ramah 23514, refresh otomatis |
| `index.html` | Tombol **➕ Tambah Data** di header Data Penetapan; cache-bust `admin-crud.js → v=20261015b`, `03-admin-data.js → v=20261015h` |
| `sql/PATCH-PENETAPAN-TAMBAH.sql` (BARU) | GRANT DML tabel penetapan utk anon (jaga-jaga), policy tulis `penetapan_write_admin` dinaikkan ke ladder **`write`** (= superadmin/operator/admin, sama seperti submissions; menyembuhkan sesi legacy `admin`), kolom `catatan_penetapan` + constraint 5 status dipastikan ada |

## Langkah admin (WAJIB, ±1 menit)

1. Supabase Dashboard → SQL Editor → jalankan **`sql/PATCH-PENETAPAN-TAMBAH.sql`** (idempotent, aman diulang).
2. Upload file revisi ini + refresh halaman (Ctrl+F5).

## Hasil pengujian

| Uji | Hasil |
|---|---|
| `scripts/test-pengusulan-edit-simpan.js` (baru) | **24/24 PASS** — 1 UPDATE untuk semua bagian sekaligus, kolom dikosongkan → null, status Pending/Batal/legacy tidak berubah sendiri, guard klik-ganda, ekspor fungsi utuh |
| `scripts/test-penetapan-tambah.js` (baru) | **48/48 PASS** — tombol & cache-bust, kolom canonical + 5 status valid, validasi (wajib/NIK 16 digit), payload sekali kirim, fallback kolom alternatif & catatan, 23514 ramah, guard klik-ganda, isi SQL patch |
| Uji browser nyata (harness) | Modal Tambah Penetapan tampil cantik desktop & mobile; simpan → payload kolom benar (`jurusan/jenjang/unit_pendayaguna/status Lulus/catatan`), toast sukses, refresh; lightbox edit → **Status "Pending" tetap terpilih**, simpan → SATU update (unit berubah, posisi dikosongkan→null, status utuh), "EDIT OPERATION COMPLETED SUCCESSFULLY" |
| Regresi: RBAC / r2-config / driver-switch / password / foto-profil / biodata | SEMUA LULUS (18, 19, 6, 35, 52, 34) |
| `node --check` semua JS | LULUS |

---

# REVISI 15 OKT i — Kartu Cek Status Pengajuan: Ringkasan Pengajuan + Tombol Preview & Unduh Dokumen (termasuk Rekomendasi Dinkes)

## Latar belakang (laporan pengguna)

> akun peserta pada kartu status pengajuan — tambahkan data yang diambil dari data pengajuan: **Jurusan tujuan, Jenjang pendidikan, Unit tujuan, Rencana tahun, Status, Catatan admin, Rekomendasi Dinkes** (tampilkan tombol **preview** dan **download**).

## Yang ditambahkan

1. **Blok "Ringkasan Pengajuan"** di bagian atas kartu (di bawah header NIK/Nama) — kartu kecil cantik bernuansa ungu berisi: **No. Register, Jurusan Tujuan, Jenjang Pendidikan, Unit Tujuan, Rencana Tahun, Status (badge warna), Catatan Admin** (kotak merah muda bila ada isi, abu bila kosong) dan baris **Rekomendasi Dinkes** berisi pasangan tombol **[👁 Preview] [⬇ Unduh]**.
2. **Tombol Preview & Unduh untuk SEMUA dokumen** — bagian "Dokumen & File" (Foto Pasfoto, Dokumen Kelengkapan, Rekomendasi Dinkes) kini memakai tombol yang sama (sebelumnya hanya link teks Google Drive).
3. **Modal pratinjau dokumen** (`simbakesPreviewDocument`): overlay layar penuh z-index tertinggi (aman di atas popup peserta) — PDF ditampilkan via PDF viewer bawaan browser, gambar via `<img>`, Google Drive via mode embed; tombol header **⬇ Unduh**, **⤴ Buka Tab Baru**, **×**; bila file tidak bisa ditanam ada panel fallback + tombol tab baru. Klik area gelap di luar modal menutup.
4. **Unduhan andal** (`simbakesDownloadDocument`): fetch → blob → simpan dengan nama file asli; bila CORS menolak (mis. Google Drive) otomatis buka tab baru + toast penjelasan.
5. **Auto-cek status**: membuka kartu dari Portal Peserta kini **langsung mencari otomatis** memakai NIK sesi — peserta tidak perlu menekan tombol "Cek Status" lagi (tetap bisa mencari manual dgn NIK/Nomor Register lain).
6. **Perbaikan kolom**: tombol aksi "📄 Lihat Dokumen" selama ini membaca `linkDokumen` (kolom yang TIDAK pernah ada) → kini membaca `dokumen_kelengkapan` yang sebenarnya.
7. **Label dimanusiakan**: judul field dari nama kolom mentah (`tempat_lahir`, `alamat_ktp`, dst.) → label manusia ("Tempat Lahir", "Alamat (KTP)", …); No. Register kini ikut tampil di header identitas.

## Perubahan

| File | Perubahan |
|---|---|
| `js/04-form.js` | Helper dokumen baru (`simbakesExtractUrls/AttrJson/DetectDocKind/FileNameFromUrl`, `simbakesPreviewDocument`, `simbakesPreviewFallback`, `simbakesClosePreview`, `simbakesDownloadDocument`, `simbakesDocActionButtons`); `displayStatusResult`: blok Ringkasan Pengajuan (7 data + Rekomendasi), prioritas kontainer inline `#search-result-inline-content` (popup peserta) dgn cermin ke modal legacy, mapping `no_register`, label manusia, semua kolom dokumen memakai tombol Preview/Unduh |
| `js/09-cek-status.js` | `setActionButtons`: tombol "Lihat Dokumen" membaca `dokumen_kelengkapan` (validasi URL + escape tetap) |
| `js/11-topbar-session.js` | `openPesertaCekStatus`: prefill NIK sesi → **auto-panggil `searchSubmissionData()`** 80ms setelah popup terbuka |
| `index.html` | Cache-bust `04-form.js`, `09-cek-status.js`, `11-topbar-session.js` → `v=20261015i` |

## Database: TIDAK ADA perubahan

Seluruh data yang ditampilkan sudah tersedia di tabel `submissions` (`no_register, jurusan_tujuan, jenjang_pendidikan, unit_tujuan, rencana_tahun, status, catatan_admin, rekomendasi_dinkes`); peserta membacanya lewat query by NIK yang sama seperti sebelumnya — **tidak ada SQL yang perlu dijalankan** untuk revisi ini.

## Hasil pengujian

| Uji | Hasil |
|---|---|
| `scripts/test-status-pengajuan-kartu.js` (baru) | **62/62 PASS** — mapping 7 field + no_register, badge status, tombol Preview/Unduh (Rekomendasi Dinkes + 3 dokumen), escape HTML & atribut onclick aman, multi-URL, nama file unduhan, prioritas kontainer inline + cermin legacy, auto-cek NIK sesi, `dokumen_kelengkapan` di tombol aksi, cache-bust |
| Uji browser nyata (harness) | Kartu dibuka → auto-cek → **Ringkasan tampil** (No. Register/Jurusan/Jenjang/Unit/Tahun/Status/Catatan); klik 👁 Preview Rekomendasi Dinkes → **modal pratinjau PDF terbuka** (viewer bawaan, header Unduh/Buka Tab Baru/tutup); tombol ⬇ Unduh menjalankan alur fetch→blob; tata letak desktop & mobile rapi |
| Regresi: biodata-ajukan / pengusulan-edit / penetapan-tambah / foto-profil / password / RBAC / r2-config / driver-switch | SEMUA LULUS (34, 24, 48, 52, 35, 18, 19, 6) — total **298 PASS, 0 FAIL** |
| `node --check` semua JS | LULUS |

## Langkah admin

1. Upload file revisi ini ke hosting + refresh halaman (Ctrl+F5). **Tidak ada SQL baru.**

---

# REVISI 15 OKT j — Data Penetapan: Upload "Bukti Lulus PT / Aktif Kuliah" (Tambah & Edit) + Tampil di Semua Titik Pembaca Data

## Latar belakang (laporan pengguna)

> pengembangan: tambahkan data di menu data penetapan — **bukti lulus PT / aktif kuliah (dalam bentuk file)**, bisa diupload oleh **admin dan operator** saat **menambahkan** atau **mengedit** data. Sesuaikan semua bagian yang mengambil data dari menu/tabel Supabase data penetapan.

## Yang ditambahkan

1. **Kolom baru** `penetapan.bukti_lulus_pt` (URL file) + **folder storage** `penetapan/` di bucket `pengajuan-files` (policy tulis anon diperluas — pola keamanan yang sama dengan folder `pengajuan/` dan `rekomendasi/`).
2. **Widget upload** di modal **Tambah Data Penetapan** dan modal **Edit Data Penetapan**: tombol **📎 Upload File** (PDF/JPG/PNG/WebP, maks 10 MB — divalidasi di sisi aplikasi), URL terisi otomatis setelah upload (atau tempel link manual), tombol **✕ Kosongkan/Hapus Bukti**, kotak status unggahan + link "(lihat)" untuk pratinjau cepat. File tersimpan ke Supabase Storage (`penetapan/<NIK>/bukti-<timestamp>-<rand>.<ext>`), URL publiknya masuk kolom `bukti_lulus_pt` — driver Cloudflare R2 otomatis dipakai bila diaktifkan (konsisten jalur upload lain).
3. **Tampil di semua titik pembaca tabel penetapan**:
   - **Tabel admin** — tombol aksi baru **🎓 Bukti** per baris (hanya muncul bila filenya ada) → modal pratinjau dokumen.
   - **Detail "👁 Lihat"** (modal detail peserta/penetapan) — baris **Bukti Lulus PT / Aktif Kuliah** dengan tombol **👁 Preview** & **⬇ Unduh**.
   - **Kartu "Cek Status Penetapan" peserta** — tombol baru **🎓 Bukti Lulus PT** di baris dokumen (membuka modal pratinjau berisi tombol Unduh & Buka Tab Baru; ikut mengganti pesan "Tidak ada link tersedia").
   - **Ekspor CSV** Data Penetapan — kolom baru "Bukti Lulus PT".
4. **Perbaikan yang ditemukan saat audit**:
   - **Ekspor CSV Data Penetapan ternyata RUSAK total** (typo `eaders` sejak revisi sebelumnya → klik Ekspor selalu "Gagal mengekspor data: eaders is not defined") — diperbaiki.
   - Kartu peserta: default `getField` yang salah membuat tombol **📷 Lihat Foto / 📄 Lihat SK tampil palsu** (membuka link matang `foto_drive_link`) bila kolomnya kosong — default diperbaiki ke string kosong.
5. **Tahan banting SQL**: bila kolom `bukti_lulus_pt` belum ada di database (patch belum dijalankan), simpan Tambah maupun Edit **tetap berhasil** — payload otomatis dicoba ulang tanpa kolom bukti + toast menunjuk file SQL. Validasi file (ukuran/tipe) gagal → pesan jelas, tanpa sukses palsu.

## Perubahan

| File | Perubahan |
|---|---|
| `sql/PATCH-PENETAPAN-BUKTI.sql` (BARU) | `alter table penetapan add column if not exists bukti_lulus_pt text` + 3 policy storage (`insert/update/delete`) diperluas dengan folder `penetapan/%` — idempotent |
| `js/03-admin-data.js` | Helper `buildPenetapanBuktiPath`, `uploadPenetapanBuktiToStorage` (R2-aware), `handlePenetapanBuktiSelect` (validasi 10 MB & tipe), `clearPenetapanBukti`; widget upload di modal Tambah & Edit; payload `bukti_lulus_pt` di `saveNewPenetapan` & `savePenetapanChanges` (+fallback PGRST204 dua jalur); tombol 🎓 Bukti di `createPenetapanRow` + `case 'bukti'` di event delegation; baris Bukti di `showPesertaDetailModal` (Preview/Unduh); ekspor CSV + kolom bukti + **perbaikan typo `eaders`** |
| `js/09-cek-status.js` | Mapping `bukti_lulus_pt`; tombol `penetapan-btn-bukti` di-wire (Preview modal / fallback tab baru, ikut `hasAnyLink`); **perbaikan default `getField`** foto/SK agar tak tampil palsu |
| `index.html` | Tombol 🎓 Bukti Lulus PT di kartu Cek Status Penetapan; label baris dokumen; cache-bust `03-admin-data.js → v=20261015j`, `09-cek-status.js → v=20261015j` |

## Langkah admin (WAJIB, ±1 menit)

1. Supabase Dashboard → SQL Editor → jalankan **`sql/PATCH-PENETAPAN-BUKTI.sql`** (idempotent, aman diulang) — menambah kolom + izin folder storage `penetapan/`.
2. Upload file revisi ini + refresh halaman (Ctrl+F5).

> Tanpa patch SQL pun aplikasi tidak rusak: simpan data tetap berhasil, hanya file bukti yang belum tersimpan (ada toast pengarah).

## Hasil pengujian

| Uji | Hasil |
|---|---|
| `scripts/test-penetapan-bukti.js` (baru) | **48/48 PASS** — isi SQL patch, widget Tambah/Edit (id, accept, handler, clear), payload simpan dua jalur + fallback PGRST204, tombol tabel & delegation, detail modal, kartu peserta, ekspor CSV + perbaikan `eaders`, cache-bust; uji runtime vm: path storage `penetapan/<NIK>/bukti-*.pdf`, sanitasi NIK, ekstensi |
| Uji browser nyata (harness) | Modal Tambah: widget tampil cantik; **upload nyata via mock storage** → path `penetapan/3201234567890001/bukti-*.pdf`, URL terisi, status ✅; **file 11 MB ditolak**, **tipe .exe ditolak**, Kosongkan bekerja; modal Edit: URL lama ter-prefill + tombol Ganti/Hapus; **saveNewPenetapan memasukkan bukti ke payload INSERT**; **PGRST204 → 2 percobaan, kedua tanpa bukti**; tabel: tombol 🎓 muncul hanya bila ada file; kartu peserta: hanya tombol yang berlaku (bukti tampil, foto/SK sembunyi bila kosong), klik 🎓 → **modal pratinjau PDF terbuka** |
| Regresi: penetapan-tambah / pengusulan-edit / status-pengajuan / biodata / foto-profil / password / RBAC / r2-config / driver-switch | SEMUA LULUS (48, 24, 62, 34, 52, 35, 18, 19, 6) — total **346 PASS, 0 FAIL** |
| `node --check` semua JS | LULUS |
