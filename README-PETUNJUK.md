# PETUNJUK PENGGUNAAN — Hub Buku Panduan & E-Book Reader

Fitur halaman **Petunjuk Penggunaan** telah dirombak menjadi halaman khusus
berisi **2 buku panduan digital** tanpa mengubah fungsi, menu, database,
autentikasi, maupun fitur lain yang sudah berjalan.

## Yang berubah

| Berkas | Status | Keterangan |
|---|---|---|
| `index.html` | Diubah (2 titik) | Isi section `#page-petunjuk` diganti markup hub; +1 tag `<script>` |
| `css/panduan.css` | Baru | Gaya hub 2 kartu buku + reader e-book |
| `js/16-panduan.js` | Baru | Logika hub, gerbang akses, reader |
| `panduan/peserta-data.js` | Baru | Isi buku "Panduan Peserta" (publik) |
| `panduan/admin-data.js` | Baru | Isi buku "Panduan Admin & Operator" (terobfuskasi XOR) |
| `panduan/fonts.css`, `panduan/fonts/` | Baru | Font lokal buku (Inter, Plus Jakarta Sans) |
| `sql/PANDUAN-ADMIN-BACKEND.sql` | Baru | Hardening opsional sisi database |
| `_headers` | Ditambah rule | `no-store, noindex` untuk `panduan/admin-data.js` |

Sumber isi kedua buku = dokumen panduan resmi platform (bukan data dummy).

## Aturan akses

**Panduan Peserta** — terbuka untuk semua pengguna, tanpa login, dibaca
langsung di dalam aplikasi (tanpa tombol unduh/simpan, tanpa tautan berkas,
tidak ikut tercetak).

**Panduan Admin & Operator** — hanya `admin` dan `operator`:

```text
Belum login            -> diarahkan ke halaman login (overlay Panel Admin)
Login sebagai peserta  -> "Anda tidak memiliki akses ke panduan ini."
Login sebagai viewer   -> "Anda tidak memiliki akses ke panduan ini."
Login sebagai operator -> boleh membaca
Login sebagai admin    -> boleh membaca (superadmin; 'admin' dinormalisasi server)
```

Role TIDAK dibaca dari tampilan browser. Setiap kali buku dibuka, sesi
divalidasi ke server via RPC `app_validate_session` (sumber kebenaran
autentikasi aplikasi) dan role diambil dari jawaban server.

## Reader e-book

Sampul asli buku, daftar isi interaktif, navigasi Sebelumnya/Berikutnya,
nomor halaman, lompat ke halaman, zoom 85%–160%, layar penuh, drawer daftar
isi, tombol Back browser menutup reader, animasi halaman, loading/error/empty
state, swipe di layar sentuh, tombol panah keyboard, responsif desktop–tablet–
smartphone (ponsel: satu halaman, tombol besar).

## Keamanan berlapis

1. **Validasi role di server** sebelum data buku admin diambil/dekripsi.
2. **Data buku admin terobfuskasi** (XOR + base64, kunci dipecah dua berkas)
   sehingga tidak terbaca secara langsung; dimuat hanya setelah validasi lulus.
3. **Tanpa tautan berkas sumber**: tidak ada tombol Download/Unduh/Simpan,
   tidak ada link PDF; konten dirender oleh reader internal.
4. **Header `_headers`**: `no-store, private` + `noindex` untuk data admin.
5. **Proteksi cetak**: konten panduan disembunyikan saat halaman dicetak.
6. **Hardening penuh (opsional, disarankan)**: jalankan
   `sql/PANDUAN-ADMIN-BACKEND.sql` di Supabase SQL Editor. Isi buku lalu
   disajikan lewat RPC `app_get_panduan_admin()` yang tervalidasi RLS
   (role `superadmin`/`operator`/`admin`); berkas `panduan/admin-data.js`
   tidak lagi dipakai dan boleh DIHAPUS dari hosting agar isi buku tidak
   ada sama sekali di berkas statis.

> Catatan jujur: pada hosting statis, konten yang pernah tampil di browser
> secara teknis tetap dapat disalin/screenshot oleh pengguna. Pengamanan di
> atas mencegah akses langsung yang mudah (tautan berkas, leecher, mesin
> pencari, pengguna tanpa login), bukan menjamin 100% anti-salin.

## Cara deploy

1. Salin seluruh berkas proyek (termasuk folder `panduan/`) ke hosting.
2. Selesai — fitur langsung berjalan.
3. (Disarankan) Jalankan `sql/PANDUAN-ADMIN-BACKEND.sql` di Supabase,
   lalu hapus `panduan/admin-data.js` dari hosting untuk penguncian maksimal.
