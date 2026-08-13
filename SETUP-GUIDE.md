# 🚀 SIMBAKES - Panduan Setup Supabase & GitHub Pages

## 📋 Daftar Isi

1. [Prasyarat](#prasyarat)
2. [Setup Supabase](#setup-supabase)
3. [Konfigurasi Koneksi](#konfigurasi-koneksi)
4. [Deploy ke GitHub Pages](#deploy-ke-github-pages)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Prasyarat

Sebelum memulai, pastikan Anda memiliki:

- ✅ Akun [GitHub](https://github.com) (gratis)
- ✅ Akun [Supabase](https://supabase.com) (gratis)
- ✅ Project SIMBAKES (file yang sudah didownload)

---

## 🔧 Setup Supabase

### Langkah 1: Buat Project Baru

1. Buka [https://supabase.com](https://supabase.com)
2. Login / Sign up
3. Klik **"New Project"**
4. Pilih **"Create new project"**
5. Isi detail project:
   - **Name**: `SIMBAKES` (atau nama lain)
   - **Database Password**: Buat password kuat (catat baik-baik!)
   - **Region**: Pilih region terdekat (Singapore direkomendasikan untuk Indonesia)
6. Klik **"Create new project"**
7. Tunggu 2-3 menit hingga project siap

### Langkah 2: Dapatkan Credentials

Setelah project siap:

1. Buka **Settings** (ikon gear) ⚙️
2. Pilih menu **"API"**
3. Catat dua informasi penting:

```
📌 URL:
https://xxxxxxxxxxxxx.supabase.co

📌 anon (public) key:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **PENTING**: Jangan bagikan SERVICE ROLE KEY (secret) ke publik!

### Langkah 3: Jalankan SQL Schema

1. Di dashboard Supabase, buka menu **"SQL Editor"**
2. Klik **"New Query"**
3. Copy seluruh isi file [`sql/schema.sql`](sql/schema.sql)
4. Paste ke editor
5. Klik **"Run"** (atau tekan Ctrl+Enter)

Schema akan membuat:
- ✅ 7 tabel (users, pengusulan, penetapan, roadmap_kebutuhan, dokumen, informasi_update, activity_log)
- ✅ Row Level Security (RLS) policies
- ✅ Auto-generated functions & triggers
- ✅ Indexes untuk performa optimal
- ✅ Sample data untuk testing

### Langkah 4: Setup Storage (Opsional)

Jika ingin fitur upload dokumen:

1. Buka menu **"Storage"**
2. Klik **"New bucket"**
3. Buat bucket bernama: `documents`
4. Settings:
   - **Public bucket**: ❌ TIDAK (untuk privasi)
   - **File size limit**: 5 MB (recommended)
   - **Allowed MIME types**: image/*, application/pdf

---

## ⚙️ Konfigurasi Koneksi

### Edit File Konfigurasi

Buka file: `config/supabase-config.js`

Ganti nilai berikut:

```javascript
const SUPABASE_CONFIG = {
    // ====== GANTI DENGAN URL ANDA ======
    URL: 'https://YOUR_PROJECT_ID.supabase.co',
    // Contoh: 'https://abcdefghijklmnop.supabase.co'
    
    // ====== GANTI DENGAN ANON KEY ANDA ======
    ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    // Contoh: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inxxxxxxxxxxx...'
    
    // ... sisanya biarkan default
};
```

### Verifikasi Koneksi

Setelah mengedit:

1. Buka `index.html` di browser
2. Setelah landing page, perhatikan pojok kanan bawah
3. Akan muncul notifikasi:
   - 🟢 **"Supabase Connected"** = Berhasil!
   - 🟡 **"Demo Mode"** = Cek konfigurasi lagi

---

## 🌐 Deploy ke GitHub Pages

### Metode 1: Upload Manual (Termudah)

#### Step 1: Push ke GitHub

```bash
# 1. Buat repository baru di GitHub (nama: SIMBAKES)

# 2. Di folder lokal SIMBAKES, jalankan:
git init
git add .
git commit -m "Initial commit - SIMBAKES"
git branch -M main
git remote add origin https://github.com/USERNAME/SIMBAKES.git
git push -u origin main
```

#### Step 2: Aktifkan GitHub Pages

1. Buka repository GitHub
2. Klik **Settings** (tab atas)
3. Scroll ke bawah, cari section **"Pages"** (menu kiri)
4. Settings:
   - **Source**: Deploy from a branch
   - **Branch**: `main` / `(root)`
5. Klik **"Save"**

#### Step 3: Akses Website

Tunggu 1-2 menit, lalu akses:

```
https://USERNAME.github.io/SIMBAKES/
```

### Metode 2: Menggunakan GitHub CLI

```bash
# Install GitHub CLI (jika belum)
# Windows: winget install GitHub.cli
# Mac: brew install gh
# Linux: sudo apt install gh

# Login
gh auth login

# Create repo & push
gh repo create SIMBAKES --public --source=. --push
```

### Metode 3: Drag & Drop (Tanpa Git)

1. Install [GitHub Desktop](https://desktop.github.com/)
2. Sign in dengan akun GitHub
3. File > New Repository
4. Pilih folder SIMBAKES
5. Click **"Publish repository"**
6. Setelah publish, buka Settings > Pages > Enable

---

## 🧪 Testing Setelah Deploy

### Checklist Testing:

- [ ] Landing page muncul 3 detik
- [ ] Sidebar bisa dibuka/tutup di mobile
- [ ] Semua navigasi berfungsi
- [ ] Formulir usulan bisa diisi
- [ ] Search pengusulan bekerja
- [ ] Data admin tables tampil
- [ ] Notifikasi "🟢 Supabase Connected" muncul

### Test Database Operations:

1. **Buka Formulir Usulan**
2. Isi data test
3. Submit form
4. Periksa di Supabase Dashboard > Table Editor > `pengusulan`
5. Data seharusnya muncul!

---

## 🔒 Keamanan & Best Practices

### ✅ Yang Sudah Aman:

- Menggunakan **ANON key** (public-safe)
- **Row Level Security** aktif
- Password tidak tersimpan di client-side
- Input validation di frontend

### ⚠️ Yang Perlu Diperhatikan:

1. **Jangan expose SERVICE_ROLE_KEY**
2. **Gunakan HTTPS** (otomatis di GitHub Pages)
3. **Validasi data** juga di backend (Supabase RLS)
4. **Rate limiting** jika traffic tinggi

### 🛡️ Tambahan Keamanan (Opsional):

Untuk production, pertimbangkan:

```sql
-- Batasi IP address (di Supabase Dashboard > Authentication > Rate Limits)
-- Enable 2FA untuk akun admin
-- Gunakan Custom Domain dengan SSL
-- Setup CORS whitelist
```

---

## 🐛 Troubleshooting

### Masalah: "Demo Mode" terus muncul

**Penyebab**: Config belum diupdate atau salah

**Solusi**:
1. Pastikan `config/supabase-config.js` sudah diedit
2. Cek URL format: harus ada `https://` di awal
3. Cek ANON key: copy ulang dari dashboard
4. Clear browser cache (Ctrl+F5)

### Masalah: Error "Invalid API key"

**Penyebab**: Key yang digunakan salah

**Solusi**:
- Gunakan **anon/public key**, BUKAN service_role_key
- Key dimulai dengan `eyJ...` (JWT format)

### Masalah: Data tidak tersimpan

**Penyebab**: RLS (Row Level Security) blocking insert

**Solusi**:
1. Buka Supabase > Authentication > Policies
2. Pastikan policy "Users can create own pengusulan" ada
3. Atau sementara nonaktifkan RLS untuk testing:
   ```sql
   ALTER TABLE public.pengusulan DISABLE ROW LEVEL SECURITY;
   ```

### Masalah: CORS Error

**Penyebab**: Domain tidak diizinkan

**Solusi**:
1. Supabase Dashboard > API > URL Configuration
2. Tambahkan domain GitHub Pages Anda:
   ```
   https://username.github.io
   ```

### Masalah: File upload gagal

**Penyebab**: Storage belum dikonfigurasi

**Solusi**:
1. Buat bucket "documents" di Storage
2. Set RLS policy untuk bucket
3. Cek ukuran file (max 5MB default)

---

## 📊 Monitoring & Analytics

### Supabase Dashboard:

- **Log Viewer**: Lihat semua query & error
- **Table Editor**: Browse/edit data langsung
- **Auth Logs**: Monitor login attempts
- **Database Usage**: Monitor performance

### Optional Integrations:

```javascript
// Google Analytics (tambah di <head>)
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>

// Sentry untuk error tracking
<script src="https://browser.sentry-cdn.com/7.x.x/bundle.min.js"></script>
```

---

## 🔄 Update & Maintenance

### Update Code:

```bash
# Pull latest changes
git pull origin main

# Otomatis terdeploy ke GitHub Pages
```

### Update Schema:

```sql
-- Jalankan migration baru di SQL Editor
ALTER TABLE public.pengusulan ADD COLUMN kolom_baru TEXT;
```

### Backup Data:

1. Supabase Dashboard > Database > Backups
2. Klik **"Create Backup"**
3. Download .sql file

---

## 📞 Support & Resources

### Dokumentasi Resmi:
- [Supabase Docs](https://supabase.com/docs)
- [GitHub Pages Docs](https://docs.github.com/pages)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

### Community:
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Discussions](https://github.com/supabase/supabase/discussions)

---

## ✅ Final Checklist

Sebelum go-live:

- [ ] Supabase project sudah dibuat
- [ ] SQL schema sudah dijalankan
- [ ] Config sudah diupdate dengan credentials
- [ ] Test semua fitur di local
- [ ] Push ke GitHub
- [ ] GitHub Pages aktif
- [] Akses via custom domain (opsional)
- [ ] SSL/HTTPS aktif (otomatis)
- [ ] Monitoring setup (opsional)
- [ ] Backup schedule configured

---

## 🎉 Selamat!

SIMBAKES Anda sekarang sudah:
- ✅ Terhubung ke database cloud (Supabase)
- ✅ Deploy di GitHub Pages (gratis & forever)
- ✅ Responsive & modern
- ✅ Siap digunakan!

---

**Dibuat dengan ❤️ untuk SIMBAKES Team**
