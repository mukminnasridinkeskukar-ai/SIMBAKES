# RINGKASAN PERUBAHAN — SIMBAKES (Revisi Privasi NIK, Profil Peserta, Role Observer)

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
