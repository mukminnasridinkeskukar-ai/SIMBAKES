# SIMBAKES - Beasiswa Tematik Bidang Kesehatan

## Deskripsi

SIMBAKES (Sistem Informasi Beasiswa Tematik Bidang Kesehatan) adalah platform untuk pengelolaan informasi dan proses pengusulan beasiswa tematik bidang kesehatan.

## Teknologi

### Frontend
- **HTML5** - Struktur semantik
- **CSS3** - Styling dengan Custom Properties, Flexbox, Grid
- **JavaScript ES6+** - Vanilla JS untuk navigasi SPA
- **Responsive Design** - Mobile-first approach

### Backend (Tahap Selanjutnya)
- **Supabase** - Backend as a Service
- **PostgreSQL** - Database
- **Supabase Storage** - File storage
- **Supabase Auth** - Autentikasi

## Struktur Project

```
SIMBAKES/
├── index.html          # Entry point utama (Landing Page + App Shell)
├── style.css           # Semua styling termasuk responsive design
├── app.js              # Logika aplikasi (SPA router, navigasi, events)
├── assets/
│   ├── images/         # Gambar dan ilustrasi
│   └── icons/          # Icon SVG custom
└── README.md           # Dokumentasi project
```

## Fitur (Tahap 1)

### Landing Page
- Tampilan elegan dengan animasi ringan
- Auto-redirect ke Beranda setelah 3 detik
- Progress bar indicator
- Gradient background profesional

### Navigasi Utama
- **Beranda**
  - Dashboard
  - Petunjuk Penggunaan
  - Roadmap Kebutuhan
  - Informasi Update

- **Layanan**
  - Formulir Usulan Rekomendasi
  - Cek Status Pengusulan
  - Cek Status Penetapan

- **Panel Admin**
  - Data Pengusulan
  - Data Penetapan
  - Data Roadmap Kebutuhan

### Fitur UI/UX
- ✅ Responsive design (Mobile, Tablet, Desktop)
- ✅ Sidebar collapsible (Drawer di mobile)
- ✅ Lightbox/Card navigation
- ✅ Warna berbeda per kategori menu
- ✅ Hover effects dan transisi halus
- ✅ SPA routing (hash-based)
- ✅ Placeholder untuk modul yang akan dikembangkan

## Sistem Warna

| Kategori | Warna | Hex Code |
|----------|-------|----------|
| Beranda | Blue | `#3B82F6` |
| Layanan | Emerald/Green | `#10B981` |
| Panel Admin | Violet/Purple | `#8B5CF6` |

## Cara Menjalankan

### Local Development
1. Clone atau download repository ini
2. Buka `index.html` di browser modern
3. Atau gunakan live server extension di VS Code

### Deployment (GitHub Pages)
1. Push ke repository GitHub
2. Aktifkan GitHub Pages di Settings > Pages
3. Pilih branch `main` dan folder `/ (root)`
4. Akses via `https://username.github.io/SIMBAKES/`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Opera (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Performance

- Tanpa framework/library eksternal
- CSS dan JavaScript vanilla yang ringan
- Animasi menggunakan CSS transitions (GPU accelerated)
- Optimized untuk loading cepat

## Development Notes

Project ini dikembangkan secara bertahap:
- **Tahap 1**: Kerangka aplikasi, landing page, navigasi, placeholder
- **Tahap 2+**: Modul fungsional sesuai instruksi

## License

© 2024 SIMBAKES - Beasiswa Tematik Bidang Kesehatan. All rights reserved.
