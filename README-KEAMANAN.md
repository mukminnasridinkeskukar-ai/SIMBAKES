# SIMBAKES — Dokumentasi Hardening Keamanan

> Versi: 2026-09-15 · Ruang lingkup: autentikasi server-side, sesi & idle
> timeout 15 menit, RBAC berlapis, RLS, XSS, header keamanan, perlindungan secret.
>
> **Catatan jujur:** tidak ada aplikasi web yang 100% aman. Dokumen ini
> menjelaskan apa yang diperkuat, apa yang tetap perlu konfigurasi
> infrastruktur, dan risiko sisa yang perlu dipantau.

---

## 1. Ringkasan Arsitektur Keamanan Baru

```
Browser (UI saja)
   │  login → RPC app_login / app_peserta_login  (password diverifikasi SERVER, bcrypt)
   │  ← token sesi acak 256-bit (disimpan sebagai SHA-256 hash di DB)
   ▼
Supabase PostgREST
   │  setiap request membawa header x-session-token
   │  policy RLS memanggil app_is_valid_session() → validasi token + role + expiry
   ▼
PostgreSQL (RLS + column grants)
   password & password_hash TIDAK PERNAH dikirim ke browser
```

**Komponen baru:**

| File | Fungsi |
|---|---|
| `sql/SECURITY-HARDENING.sql` | Sesi server-side, RPC login/validate/logout, RLS berlapis, trigger hash password |
| `js/security-guard.js` | Idle timeout 15 menit, validasi sesi ke server (load/online/tab aktif/bfcache), logout aman + redirect, hygiene console |
| `_headers` | HSTS, X-Frame-Options, XCTO, CSP penuh (untuk Cloudflare/Netlify) |
| `.gitignore` | Cegah `.env`, secret, kredensial masuk repo |

---

## 2. WAJIB DILAKUKAN PEMILIK APLIKASI (Urutan Deploy)

### Langkah 1 — Jalankan SQL hardening (5 menit)
1. Buka **Supabase Dashboard → SQL Editor**.
2. Tempel **seluruh isi** `sql/SECURITY-HARDENING.sql` → **Run**.
3. Pastikan output verifikasi di bagian bawah menampilkan daftar objek tanpa error.

> SQL ini idempotent (aman dijalankan ulang). Ia menambah tabel/fungsi baru
> dan **menambah** kolom (locked_until, login_attempts, password_hash) —
> struktur/tabel lama tidak diubah atau dihapus.

### Langkah 2 — Deploy frontend baru
Upload seluruh folder (semua file `js/` versi `?v=20260915s`) bersamaan.
Client baru otomatis memakai RPC; jika SQL belum dijalankan, client akan
**fallback ke jalur lama** hanya agar aplikasi tidak rusak, sambil mencatat
peringatan di console. Keamanan penuh baru aktif setelah Langkah 1 + 2 selesai.

### Langkah 3 — Header keamanan HTTP
- **Jika hosting GitHub Pages:** idealnya taruh domain di belakang **Cloudflare**
  (gratis) → aktifkan *Always Use HTTPS* + HSTS. Header `X-Frame-Options`,
  `X-Content-Type-Options`, dan `frame-ancestors` hanya bisa lewat sana.
- **Jika Cloudflare Pages/Netlify:** file `_headers` yang disertakan otomatis berlaku.

### Langkah 4 — GitHub
- Pastikan `.gitignore` ikut ter-commit.
- Aktifkan **Branch Protection** di `Settings → Branches` (wajib PR untuk `main`).
- Cek riwayat repo: jika ada secret lama pernah ter-commit, **rotasi
  kredensial** tersebut di Supabase.

### Langkah 5 (opsional namun disarankan)
- **pg_cron** untuk membersihkan sesi kedaluwarsa:
  ```sql
  select cron.schedule('purge-simbakes-sessions', '0 3 * * *',
    $$ select public.app_purge_expired_sessions(); $$);
  ```
- Tinjau **Storage bucket** dokumen pengajuan (`setup-storage-pengajuan.sql`):
  jika bucket `public`, dokumen (STR/SIP/foto) dapat diakses siapa pun yang
  tahu URL-nya. Pertimbangkan bucket privat + signed URL.

---

## 3. Yang Diperkuat (Per Layer)

| Layer | Sebelum | Sesudah |
|---|---|---|
| **Authentication** | Password peserta dibanding plaintext **di browser**; hash admin diunduh ke browser | Verifikasi **server-side** (bcrypt, auto-upgrade dari SHA-256/plaintext lama); hash tak pernah keluar dari DB |
| **Brute force** | `login_attempts` dihitung & direset **client** | Kunci akun 15 menit dihitung **server** (5 gagal) |
| **Session** | localStorage 8 jam, tanpa validasi server | Token server-side, idle **15 menit**, absolut 12 jam, dapat direvoke; divalidasi ulang saat load/online/tab aktif/heartbeat 5 menit |
| **Authorization** | Hanya sembunyikan menu di frontend | RBAC divalidasi **server** via policy + RPC (`write`/`superadmin`); role profil selalu dari server |
| **Database/RLS** | `USING (true)` untuk anon di banyak operasi | multiusers terkunci total; akun_peserta: SELECT kolom aman + INSERT publik saja (UPDATE/DELETE via RPC admin); submissions/roadmap/penetapan: tulis wajib sesi admin |
| **Data sensitif** | `password`, `password_hash`, NIK terekspor | Column-grants menyembunyikan kolom password; registrasi otomatis di-hash trigger; NIK hanya tampil untuk pemilik/admin |
| **XSS** | `onclick="window.open('${linkDokumen}')"` + 20+ field DB dirender mentah | Semua field user di-escape; link dokumen divalidasi protokol + data-attribute; CSP `object-src 'none'`, `base-uri 'self'` |
| **Error message** | Kode error/struktur DB tampil ke pengguna | Pesan generik "Terjadi kesalahan. Silakan coba kembali." |
| **Console** | Tombol debug mencetak seluruh sesi; log berisi username/NIK | Tombol debug dihapus; `console.log/info` disenyapkan di produksi (`?debug=1` untuk debugging) |
| **Logout** | Hapus localStorage, halaman masih bisa di-Back | Revoke token di server + bersih-bersih state + `location.replace()` ke `https://mukminnasri.com/` (Back tidak kembali ke halaman protected) |

---

## 4. Matriks Skenario Uji (sesuai spesifikasi)

| # | Skenario | Hasil yang diharapkan | Status |
|---|---|---|---|
| 1 | Login normal (admin & peserta) | Berhasil via RPC server-side | ✅ diimplementasikan |
| 2 | Buka tab baru | Token sama, sesi **divalidasi ulang ke server** saat boot | ✅ |
| 3 | Refresh halaman | UI dipulihkan, token divalidasi server; gagal → logout | ✅ |
| 4 | Direct URL protected (belum login) | Diblok gate `showPage` → diminta login | ✅ |
| 5 | Tidak aktif 14 menit | Tetap login | ✅ (idle timer 15:00) |
| 6 | Tidak aktif 15 menit | Auto logout + pesan + redirect | ✅ |
| 7 | Internet reconnect | Event `online` → validasi ulang; invalid → logout | ✅ |
| 8 | Session expired di server | Heartbeat/validasi mendeteksi → logout | ✅ |
| 9 | Back setelah logout | `location.replace()` + validasi bfcache → tidak ada akses protected | ✅ |
| 10 | User biasa akses URL admin | Gate menu + **policy RLS menolak tulisan** di server | ✅ |
| 11 | Manipulasi role di browser | Role dari server; policy RLS tak terpengaruh DevTools | ✅ |
| 12 | Request API tanpa sesi (tulis) | Policy RLS menolak (update/delete submissions, roadmap, dll.) | ✅ |
| 13 | Request dengan sesi expired | Token kedaluwarsa ditolak server | ✅ |
| 14 | XSS lewat input | Escape + validasi protokol + CSP | ✅ |
| 15 | SQL injection | PostgREST parameterized; arg RPC bertipe; tanpa query dinamis dari input | ✅ |
| 16 | Secret dicari di frontend | Tidak ada secret/service-role di frontend | ✅ |
| 17 | Service-role key | Tidak ada di frontend (verifikasi grep) | ✅ |
| 18 | `.env` masuk repo | `.gitignore` disertakan | ✅ |
| 19 | Redirect setelah logout | `https://mukminnasri.com/` | ✅ |

---

## 5. Risiko Sisa & Batasan (Objektif)

1. **GitHub Pages tidak mendukung header kustom** → HSTS/XCTO/`frame-ancestors`
   baru aktif bila memakai `_headers` (Cloudflare Pages/Netlify) atau Cloudflare
   proxy. Sampai itu dilakukan, CSP hanya via meta tag.
2. **CSP memakai `'unsafe-inline'` untuk script** — dipakai karena aplikasi
   berbasis banyak inline handler; menghilangkannya menuntut refactor besar.
   CSP tetap memblokir host eksternal, `object-src`, `base-uri`.
3. **SELECT publik `submissions`** dipertahankan karena fitur "Cek Status"
   publik & dashboard membutuhkannya. Data pengajuan bisa dibaca siapa pun
   yang paham API. Jika ingin menutup: buat RPC pencarian ber-parameter NIK +
   revoke SELECT anon (perlu pengujian menyeluruh).
4. **Token sesi disimpan di localStorage** (kebutuhan: sesi berlaku di tab
   baru). Token berumur pendek (15 menit idle / 12 jam absolut) dan dicabut
   saat logout, tetapi tetap terekspos bila ada XSS — lapisan RLS adalah
   penahan utamanya.
5. **Kolom `password` plaintext lama** pada akun_peserta tetap ada (kolom
   tidak boleh dihapus tanpa uji). Ia dikosongkan otomatis akun demi akun
   saat login pertama setelah SQL dijalankan, dan trigger baru mencegah
   plaintext tersimpan lagi. Segera setelah semua peserta pernah login,
   jalankan: `update akun_peserta set password = null;`
6. **Storage bucket** dokumen (jika public) berada di luar cakupan perubahan
   ini — lihat Langkah 5.
7. **Rate limiting** per-IP pada level API belum ada (butuh edge function /
   proxy). Saat ini hanya lockout per-akun di server.

---

## 6. Daftar File yang Diubah/Ditambah

**Baru:** `sql/SECURITY-HARDENING.sql`, `js/security-guard.js`, `_headers`,
`.gitignore`, `README-KEAMANAN.md`

**Diubah:** `index.html` (CSP meta, include guard, versi cache),
`daftar-peserta.html` (CSP meta, autocomplete), `js/supabase-config.js`
(inisialisasi senyap + header sesi), `js/02-auth-navigation.js` (login RPC,
sesi minimal, logout aman), `js/11-topbar-session.js` (login peserta RPC,
logout aman, escape), `js/12-multiuser-init.js` (restore butuh token),
`js/14-panel-admin-fix.js` (restore butuh token), `js/13-akun-peserta.js`
(RPC admin + fallback), `js/10-admin-pengusul.js` (hapus debug sesi, pesan
error aman), `js/04-form.js` (escape hasil cek status, validasi link),
`js/09-cek-status.js` (escape + perbaikan onclick injection).

**Tidak diubah:** desain UI, struktur menu, nama menu, tabel database lama,
fungsi publik (form pengajuan, cek status, roadmap, dashboard pengunjung).
