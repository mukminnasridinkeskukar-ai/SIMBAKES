# SIMBAKES - Beasiswa Tematik Bidang Kesehatan

## Deskripsi

SIMBAKES (Sistem Informasi Beasiswa Tematik Bidang Kesehatan) adalah platform web untuk pengelolaan informasi dan proses pengusulan beasiswa tematik bidang kesehatan.

## ✨ Fitur Lengkap

### 🏠 Beranda
- **Dashboard** - Statistik real-time dengan animasi
- **Petunjuk Penggunaan** - Panduan step-by-step lengkap
- **Roadmap Kebutuhan** - Timeline visualisasi program
- **Informasi Update** - Sistem berita & pengumuman

### 🎯 Layanan
- **Formulir Usulan Rekomendasi** - Multi-step form dengan validasi
- **Cek Status Pengusulan** - Pencarian by nomor/NIK
- **Cek Status Penetapan** - Hasil penetapan penerima

### ⚙️ Panel Admin
- **Data Pengusulan** - CRUD table dengan filter & export
- **Data Penetapan** - Manajemen penerima beasiswa
- **Data Roadmap Kebutuhan** - Monitoring kuota & progress

## 🛠️ Teknologi

### Frontend
- **HTML5** - Struktur semantik
- **CSS3** - Custom properties, Flexbox, Grid, Animations
- **JavaScript ES6+** - Vanilla JS, SPA Router
- **Responsive Design** - Mobile-first approach

### Backend & Database
- **Supabase** - Backend as a Service (PostgreSQL)
- **Supabase Auth** - Autentikasi user (opsional)
- **Supabase Storage** - Upload dokumen (opsional)
- **Row Level Security** - Keamanan data otomatis

### Deployment
- **GitHub Pages** - Hosting statis gratis
- **CDN** - Supabase SDK dari unpkg.com

## 📁 Struktur Project

```
SIMBAKES/
├── index.html              # Entry point utama
├── style.css               # Styling lengkap (~49KB)
├── app.js                  # Logic aplikasi dengan Supabase integration
│
├── config/
│   └── supabase-config.js  # Konfigurasi koneksi Supabase
│
├── lib/
│   └── supabase-client.js  # Database helper & CRUD operations
│
├── sql/
│   └── schema.sql          # SQL schema untuk Supabase database
│
├── assets/
│   ├── images/             # Gambar & ilustrasi
│   └── icons/              # Icon SVG custom
│
├── SETUP-GUIDE.md          # Panduan setup lengkap
└── README.md               # File ini
```

## 🚀 Quick Start

### 1. Prasyarat

- Akun [GitHub](https://github.com) (gratis)
- Akun [Supabase](https://supabase.com) (gratis)

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor**
3. Copy-paste isi file `sql/schema.sql`
4. Klik **Run**
5. Buka **Settings > API**
6. Copy **URL** dan **anon key**

### 3. Konfigurasi

Edit file `config/supabase-config.js`:

```javascript
URL: 'https://YOUR_PROJECT_ID.supabase.co',
ANON_KEY: 'YOUR_ANON_KEY_HERE',
```

### 4. Test Lokal

Cukup buka `index.html` di browser modern!

Atau gunakan local server:
```bash
python3 -m http.server 8000
```

### 5. Deploy ke GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/SIMBAKES.git
git push -u origin main
```

Lalu aktifkan GitHub Pages di repository Settings.

## 📊 Mode Operasi

### 🟢 Connected Mode (Supabase Aktif)
- Semua data tersimpan di cloud database
- Real-time sync antar device
- Data persisten & aman
- Support multi-user

### 🟡 Demo Mode (Offline/Fallback)
- Menggunakan data sample lokal
- Fungsionalitas tetap berjalan
- Ideal untuk development/presentation
- Otomatis fallback jika Supabase tidak terkoneksi

## 🎨 Sistem Warna

| Bagian | Warna | Hex Code |
|--------|-------|----------|
| Beranda | Blue | `#3B82F6` |
| Layanan | Emerald | `#10B981` |
| Panel Admin | Violet | `#8B5CF6` |

## 📱 Responsive Breakpoints

| Device | Breakpoint | Layout |
|--------|------------|--------|
| Smartphone | < 480px | Drawer sidebar, stacked layout |
| Tablet Small | < 768px | Collapsible sidebar |
| Tablet Large | < 1024px | Visible sidebar |
| Desktop | ≥ 1024px | Full layout with fixed sidebar |

## 🔧 Konfigurasi Lanjutan

### Environment Variables (Opsional)

Untuk production, pertimbangkan menggunakan environment variables:

```javascript
// Dapatkan dari meta tag atau config endpoint
const CONFIG = {
    SUPABASE_URL: document.querySelector('meta[name="supabase-url"]')?.content,
    SUPABASE_KEY: document.querySelector('meta[name="supabase-key"]')?.content
};
```

### Custom Domain

1. Setup custom domain di GitHub Pages Settings
2. Update CORS di Supabase Dashboard
3. Add domain ke allowed list

## 📈 Performance

- **Total Size**: ~180 KB (uncompressed)
- **ZIP Size**: ~28 KB
- **Load Time**: < 2 detik (dengan cache)
- **Lighthouse Score**: 90+ (target)

## 🔒 Keamanan

✅ Implementasi keamanan:
- Row Level Security (RLS)
- Input sanitization
- XSS protection
- CSRF protection (via Supabase)
- No sensitive data in localStorage

## 🐛 Troubleshooting

Lihat [`SETUP-GUIDE.md`](SETUP-GUIDE.md) untuk panduan troubleshooting lengkap.

Masalah umum:
1. **"Demo Mode" muncul** → Cek config/supabase-config.js
2. **Error "Invalid API key"** → Gunakan ANON key, bukan service_role
3. **Data tidak tersimpan** → Cek RLS policies di Supabase
4. **CORS error** → Tambahkan domain ke Supabase settings

## 📚 Dokumentasi

- [Setup Guide](SETUP-GUIDE.md) - Panduan setup detail
- [Supabase Docs](https://supabase.com/docs) - Dokumentasi resmi
- [GitHub Pages Docs](https://docs.github.com/pages) - Deployment guide

## 🤝 Kontribusi

1. Fork repository
2. Create branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

© 2024 SIMBAKES - Beasiswa Tematik Bidang Kesehatan. All rights reserved.

---

## 💡 Tips & Tricks

### Development Tips:
- Gunakan browser DevTools untuk debug
- Cek Console untuk log status koneksi
- Test di multiple devices untuk responsive design

### Production Tips:
- Monitor usage di Supabase Dashboard
- Setup regular backups
- Enable logging untuk audit trail
- Consider CDN for static assets

---

**Dibuat dengan ❤️ menggunakan HTML, CSS, JavaScript + Supabase**

🌐 Live Demo: [Ganti dengan URL GitHub Pages Anda]
