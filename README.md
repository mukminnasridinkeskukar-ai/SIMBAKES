# SIMBAKES - Sistem Manajemen Beasiswa Kesehatan

**Beasiswa Tematik Bidang Kesehatan**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Supabase](https://img.shields.io/badge/backend-Supabase-green)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub_Pages-orange)

---

## 📋 Deskripsi

SIMBAKES adalah sistem informasi manajemen beasiswa tematik bidang kesehatan yang dirancang untuk mengelola seluruh proses beasiswa mulai dari pengajuan, seleksi, hingga penetapan penerima beasiswa.

## 🏗️ Arsitektur Teknologi

| Komponen | Teknologi | Deskripsi |
|----------|-----------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript ES6+ | Static pages deployable ke GitHub Pages |
| **Backend** | Supabase (PostgreSQL) | Database + Authentication + Storage |
| **Hosting** | GitHub Pages | Static site hosting |
| **CDN** | Supabase JS Client v2, Font Awesome 6 | External libraries |

## 📁 Struktur Folder

```
simbakes/
├── index.html                    # Landing page / Dashboard
├── login.html                    # Halaman login
├── modules/                      # Folder modul aplikasi
│   ├── roadmap_kebutuhan.html    # Modul Roadmap Kebutuhan
│   ├── data_pengusulan.html      # Modul Form Pengusulan
│   ├── data_penetapan.html       # Modul Data Penetapan
│   └── multiusers.html           # Modul Manajemen User
├── assets/                       # Aset statis
│   ├── css/
│   │   └── style.css             # Global stylesheet
│   └── js/
│       ├── supabase-client.js    # Supabase client & query helpers
│       ├── auth.js               # Authentication module
│       ├── utils.js              # Utility functions
│       └── storage.js            # File upload/download module
├── config/
│   └── supabase-config.js        # Konfigurasi Supabase credentials
├── docs/                         # Dokumentasi database
│   ├── simbakes_database.sql     # Schema database utama
│   ├── simbakes_multiusers_auth.sql # Schema auth & RLS
│   └── simbakes_storage_design.md # Desain storage bucket
└── README.md                     # Dokumentasi ini
```

## 🚀 Instalasi & Setup

### Prasyarat

1. Akun [Supabase](https://supabase.com) (gratis)
2. Akun [GitHub](https://github.com) (untuk hosting)
3. Text editor (VS Code recommended)

### Langkah 1: Setup Supabase

1. Buat project baru di [Supabase Dashboard](https://app.supabase.com)
2. Copy **Project URL** dan **Anon/Public Key** dari Settings > API
3. Buka SQL Editor dan jalankan file `docs/simbakes_database.sql`
4. Jalankan `docs/simbakes_multiusers_auth.sql` untuk setup Auth & RLS
5. Buat Storage bucket dengan nama `simbakes` (lihat `docs/simbakes_storage_design.md`)

### Langkah 2: Konfigurasi Frontend

1. Edit file `config/supabase-config.js`:
```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL',        // Ganti dengan URL Anda
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // Ganti dengan Anon Key Anda
};
```

### Langkah 3: Deploy ke GitHub Pages

1. Buat repository baru di GitHub
2. Upload semua file dalam folder ini
3. Aktifkan GitHub Pages:
   - Settings > Pages > Source: main branch > / (root)
4. Akses situs di `https://username.github.io/repo-name`

## 👥 Modul Tersedia

### 1. Roadmap Kebutuhan (`modules/roadmap_kebutuhan.html`)
- Master data kebutuhan beasiswa
- 10 field data (kode, jurusan, PT, status, dll)
- Statistik & filter
- Read-only display

### 2. Data Pengusulan (`modules/data_pengusulan.html`)
- Form pengajuan beasiswa (21 field)
- Upload pasfoto (JPG/PNG/WebP, max 2MB)
- Upload dokumen pendukung (PDF/JPG/PNG, max 5MB)
- Validasi client-side
- Integrasi Supabase Storage

### 3. Data Penetapan (`modules/data_penetapan.html`)
- Data penerima beasiswa yang ditetapkan (13 field)
- Standalone (tanpa JOIN ke pengusulan)
- Preview foto & download dokumen
- Status badge (aktif/selesai/dibatalkan)

### 4. Multiusers (`modules/multiusers.html`)
- Manajemen akun pengguna
- Role-based access control (5 level)
- Distribusi role & statistik
- Search & filter user

## 🔐 Autentikasi & Authorization

### Role System

| Role | Level | Hak Akses |
|------|-------|-----------|
| `super_admin` | 5 | Kelola user, konfigurasi, akses penuh |
| `admin` | 4 | CRUD data, manage users |
| `approver` | 3 | Lihat data, approve/reject |
| `operator` | 2 | Input data pengusulan |
| `viewer` | 1 | Hanya baca (read-only) |

### Password Security
- Menggunakan **Supabase Auth** (bcrypt hashing)
- Kolom `password` di tabel = NULL (tidak disimpan)
- Session management via JWT
- Auto token refresh

## 💾 Struktur Database

### Tabel Utama (4 tabel)

1. **roadmap_kebutuhan** (10 kolom) - Master kebutuhan beasiswa
2. **data_pengusulan** (21 kolom) - Data usulan/pengajuan
3. **data_penetapan** (13 kolom) - Data penetapan/SK
4. **multiusers** (6 kolom + id UUID) - Manajemen user

### Storage Bucket

```
simbakes/
├── pasfoto/{nik}/{filename}      # Foto pasfoto penerima
└── dokumen/{nik}/{filename}      # Dokumen pendukung (PDF)
```

## 🔧 Konfigurasi Tambahan

### Environment Variables (Opsional)

Untuk production, pertimbangkan menggunakan environment variables:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Custom Domain

1. Tambahkan CNAME record di DNS provider
2. Configure custom domain di GitHub Settings > Pages
3. Update base URL jika perlu

## 📱 Responsive Design

- **Desktop**: Full layout (>1024px)
- **Tablet**: Adapted layout (768px - 1024px)
- **Mobile**: Optimized (<768px)

## 🛡️ Keamanan

- ✅ Row Level Security (RLS) aktif
- ✅ Password hashing oleh Supabase Auth
- ✅ JWT-based session management
- ✅ Input validation client-side
- ✅ File type & size validation
- ✅ XSS prevention (escape HTML)

## 📄 License

MIT License - Bebas digunakan untuk keperluan internal.

## 👨‍💻 Support & Kontribusi

Untuk bug report atau feature request, silakan buat issue di repository GitHub.

---

**Developed with ❤️ for SIMBAKES Team**
