# 🚀 SIMBAKES - Panduan Setup Supabase + GitHub Pages

## 📋 Daftar File yang Dihasilkan

| File | Deskripsi |
|------|-----------|
| `simbakes_supabase_schema.sql` | SQL Schema lengkap untuk 4 tabel (dari Excel) |
| `supabase-client.js` | Client library untuk koneksi Supabase |
| `simbakes-integration.js` | Integration layer (connector ke template HTML) |

---

## 🔧 LANGKAH 1: Setup Project Supabase

### 1.1 Buat Project Baru
1. Buka [https://supabase.com](https://supabase.com)
2. Login / Sign up
3. Klik **"New Project"**
4. Isi:
   - **Name**: `simbakes-database`
   - **Database Password**: Buat password kuat (catat!)
   - **Region**: Pilih terdekat (Singapore direkomendasikan)
   - **Plan**: Free tier (cukup untuk mulai)

### 1.2 Dapatkan Credentials
Setelah project dibuat:
1. Buka **Settings** → **API**
2. Copy values berikut:

```
Project URL: https://xxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🗃️ LANGKAH 2: Jalankan SQL Schema

### 2.1 Buka SQL Editor
1. Di dashboard Supabase, klik **SQL Editor**
2. Klik **"New Query"**

### 2.2 Paste & Jalankan Schema
1. Copy seluruh isi file `simbakes_supabase_schema.sql`
2. Paste di SQL Editor
3. Klik **"Run"** (atau Ctrl+Enter)

### 2.3 Verifikasi Tabel Terbuat
Buka **Table Editor**, seharusnya ada 4 tabel:
- ✅ `multiusers` (3 data default)
- ✅ `data_pengusulan` (kosong, siap import)
- ✅ `data_penetapan` (kosong)
- ✅ `roadmap_kebutuhan` (template kosong)

---

## 🔒 LANGKAH 3: Konfigurasi CORS (PENTING!)

### 3.1 Mengatasi CORS untuk GitHub Pages

CORS (Cross-Origin Resource Sharing) wajib dikonfigurasi agar frontend GitHub bisa mengakses API Supabase.

#### Opsi A: Via Dashboard (Rekomendasi)
1. Buka **Settings** → **API**
2. Scroll ke **"URL Configuration"** atau **"CORS"**
3. Tambahkan URL berikut:

```
# Untuk Production (GitHub Pages)
https://[username].github.io
https://[username].github.io/[repo-name]

# Untuk Development Local
http://localhost:3000
http://localhost:5500
http://127.0.0.1:5500
```

4. Klik **Save**

#### Opsi B: Via SQL (Jika opsi A tidak tersedia)
```sql
-- Jalankan ini di SQL Editor setelah schema utama
-- Catatan: Beberapa versi Supabase menggunakan config file, bukan SQL

-- Enable CORS untuk semua origins (hanya untuk development!)
-- Production: Ganti dengan domain spesifik Anda

ALTER TABLE public.multiusers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_pengusulan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_penetapan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_kebutuhan ENABLE ROW LEVEL SECURITY;
```

#### Opsi C: Menggunakan Edge Functions (Advanced)
Jika CORS masih bermasalah, buat Edge Function sebagai proxy:

```javascript
// supabase/functions/cors-proxy/index.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      },
    })
  }

  // Proxy actual request
  const response = await fetch(req)
  
  return new Response(response.body, {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers),
      'Access-Control-Allow-Origin': '*',
    },
  })
})
```

---

## 💻 LANGKAH 4: Setup Frontend (GitHub)

### 4.1 Struktur Folder Project
```
your-repo/
├── index.html              # Template SIMBAKES (JANGAN DIUBAH!)
├── supabase-client.js      # Download dari output ini
├── simbakes-integration.js # Download dari output ini
├── css/                    # Folder CSS template
├── js/                     # Folder JS template (jika ada)
└── assets/                 # Gambar, icons, dll
```

### 4.2 Edit Konfigurasi Supabase Client
Buka `supabase-client.js`, cari bagian ini dan ganti:

```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL',           // ← GANTI!
    anonKey: 'YOUR_SUPABASE_ANON_KEY'   // ← GANTI!
};
```

Menjadi:
```javascript
const SUPABASE_CONFIG = {
    url: 'https://abcdefghijk.supabase.co',  // URL project Anda
    anonKey: 'eyJhbGciOiJIUz...'              // Anon key Anda
};
```

### 4.3 Tambahkan Script ke HTML
Di file `index.html`, tambahkan SEBELUM `</body>`:

```html
<!-- Simbakes Supabase Integration -->
<script src="supabase-client.js"></script>
<script src="simbakes-integration.js"></script>
```

---

## 🌐 LANGKAH 5: Deploy ke GitHub Pages

### 5.1 Push ke Repository
```bash
git init
git add .
git commit -m "Add SIMBAKES with Supabase integration"
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

### 5.2 Aktifkan GitHub Pages
1. Buka repository di GitHub
2. Go to **Settings** → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / root
5. Click **Save**

### 5.3 Akses Website
Tunggu beberapa menit, lalu akses:
```
https://USERNAME.github.io/REPO_NAME/
```

---

## 👤 LANGKAH 6: Setup Authentication

### 6.1 Password Hashing (Production)
Schema sudah include field `password` di tabel `multiusers`. Untuk production:

**Opsi A: Gunakan Supabase Auth (Recommended)**
1. Buat custom login function via Edge Function
2. Hash password dengan bcrypt

**Opsi B: Simple Auth (Development/Demo)**
Password disimpan plain text (sudah termasuk di schema). Gunakan hanya untuk development!

### 6.2 Default Login Credentials (dari Excel)
| Username | Password | Role |
|----------|----------|------|
| superadmin | `Aida2007###` | Super Admin |
| operator2 | `EtaSDMK2024@` | Admin |

---

## 📊 LANGKAH 7: Import Data dari Excel

### 7.1 Import data_pengusulan (97 rows)
Gunakan fitur import di integration layer atau jalankan SQL manual:

```sql
-- Contoh insert satu data (dari Excel row 0)
INSERT INTO public.data_pengusulan (
    nik, nama_lengkap, tempat_lahir, tanggal_lahir,
    alamat_ktp, alamat_domisili, lama_domisili_tahun,
    jurusan_tujuan, jenjang_pendidikan, unit_tujuan_pemanfaatan,
    rencana_tahun_studi, no_hp, no_whatsapp, email, dokumen
) VALUES (
    '6402137101990001',
    'Devi Nilam Laila Safitri',
    'Tenggarong',
    '1999-01-31',
    'JL BPPN Handil II RT001/RW000, Sungai Seluang, samboja, kalimantan timur',
    'JL BPPN Handil II RT001/RW000, Sungai Seluang, samboja, kalimantan timur',
    5,
    'spesialis_radiologi',
    'Sp1',
    'RSUD Aji Muhammad Idris',
    2026,
    '895342049731',
    '895342049731',
    'Nilamlaila31@gmail.com',
    'https://drive.google.com/drive/folders/1P-BYPa3574L3T6vpRQFQgF-ZNjni1eBf'
);
```

### 7.2 Bulk Import via CSV
1. Export Excel ke CSV
2. Upload via Supabase Dashboard → Table Editor → Import

---

## 🐛 Troubleshooting

### Error: "CORS policy blocked"
**Solusi**: 
- Pastikan URL GitHub Pages sudah ditambahkan di CORS settings
- Clear browser cache
- Coba incognito mode

### Error: "Invalid API key"
**Solusi**:
- Cek lagi URL dan Anon Key di `supabase-client.js`
- Pastikan tidak ada spasi extra

### Error: "relation does not exist"
**Solusi**:
- Jalankan ulang SQL schema di SQL Editor
- Cek typo nama tabel (case-sensitive!)

### Error: "new row violates row-level security policy"
**Solusi**:
- User harus login dulu sebelum CRUD operations
- Cek RLS policies di schema

### Data tidak muncul
**Solusi**:
- Buka browser console (F12)
- Cek error logs dari `[SIMBAKES]`
- Verify network tab untuk failed requests

---

## 🔒 Security Best Practices

### ✅ DO:
- [ ] Gunakan HTTPS (GitHub Pages otomatis HTTPS)
- [ ] Rotate API keys secara berkala
- [ ] Enable RLS (sudah include di schema)
- [ ] Validasi input di frontend + backend
- [ ] Limit data yang di-return per query

### ❌ DON'T:
- [ ] Jangan expose service_role key di client-side code
- [ ] Jangan disable RLS di production
- [ ] Jangan commit credentials ke git (use .env)
- [ ] Jangan gunakan plain text passwords di production

---

## 📁 Struktur Database Final

```
┌─────────────────────────────────────────────────────────────┐
│                    SIMBAKES DATABASE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────────┐                  │
│  │  multiusers  │────<│ data_pengusulan  │                  │
│  │  (auth table) │ 1:N │ (97 rows target) │                  │
│  └──────────────┘     └────────┬─────────┘                  │
│                                 │                            │
│                                 │ 1:1                        │
│                                 ▼                            │
│                        ┌──────────────────┐                 │
│                        │ data_penetapan   │                 │
│                        │ (18 rows target) │                 │
│                        └──────────────────┘                 │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │          roadmap_kebutuhan                    │           │
│  │          (workforce planning)                 │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  Views:                                                      │
│  ├── v_dashboard_stats                                      │
│  └── v_pengusulan_full                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📞 Support & Resources

- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Supabase Discord**: [discord.supabase.com](https://discord.supabase.com)
- **GitHub Pages Docs**: [pages.github.com](https://pages.github.com)

---

## ✅ Checklist Sebelum Go-Live

- [ ] SQL schema berhasil dijalankan tanpa error
- [ ] CORS sudah dikonfigurasi dengan benar
- [ ] `supabase-client.js` sudah diisi credential
- [ ] Template HTML tetap berfungsi normal
- [ ] Login/logout berhasil
- [ ] CRUD operations bekerja (Create, Read, Update, Delete)
- [ ] Data tampil di dashboard
- [ ] Export/Import berfungsi
- [ ] Mobile responsive masih OK
- [ ] Browser console bersih dari error

---

**Selamat! SIMBAKES Anda siap terhubung ke Supabase! 🎉**
