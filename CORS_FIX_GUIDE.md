# 🚨 PANDUAN PERBAIKAN ERROR "Failed to Fetch" - SIMBAKES

## 📋 Masalah
Error: `[SIMBAKES] ⚠️ Fetch error: Failed to fetch | URL: https://boeknpvifamjmddsdopd.supabase.co/rest/v1/roadmap_keb...`

## 🔍 Penyebab
**CORS (Cross-Origin Resource Sharing) tidak dikonfigurasi** di Supabase untuk domain GitHub Pages Anda.

Browser memblokir request dari domain `simbakes.mukminnasri.com` ke Supabase karena tidak ada izin CORS.

---

## ✅ SOLUSI: Konfigurasi CORS di Supabase

### Langkah 1: Buka Supabase Dashboard
1. Buka: **https://supabase.com/dashboard**
2. Login dengan akun Anda
3. Pilih project: **`boeknpvifamjmddsdopd`**

### Langkah 2: Tambahkan Domain ke CORS Configuration
1. Klik menu **Settings** (⚙️) di sidebar kiri
2. Pilih submenu **API**
3. Scroll ke bawah ke bagian **"CORS Configuration"**
4. Di kolom input, tambahkan URL berikut:
   ```
   https://simbakes.mukminnasri.com
   ```
5. Jika ada domain lain, tambahkan juga:
   ```
   http://localhost:3000
   http://127.0.0.1:5500
   http://localhost:5500
   ```
6. Klik tombol **Save**

### Langkah 3: Pastikan Tabel Roadmap Ada
Jika error masih muncul dengan pesan "Table not found", jalankan SQL ini:

```sql
-- Buat tabel roadmap_kebutuhan jika belum ada
CREATE TABLE IF NOT EXISTS public.roadmap_kebutuhan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_lengkap TEXT,
    nik TEXT,
    jurusan TEXT,
    jenjang_pendidikan TEXT,
    perguruan_tinggi TEXT,
    institusi TEXT,
    pekerjaan TEXT,
    posisi_jabatan TEXT,
    unit_kerja TEXT,
    alamat TEXT,
    no_hp TEXT,
    email TEXT,
    status TEXT DEFAULT 'aktif',
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.roadmap_kebutuhan ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all reads (public access)
CREATE POLICY "Allow public read access" ON public.roadmap_kebutuhan
    FOR SELECT USING (true);

-- Policy: Allow authenticated inserts (if using Supabase Auth)
CREATE POLICY "Allow authenticated insert" ON public.roadmap_kebutuhan
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR true);
```

### Langkah 4: Test Ulang
1. Setelah menyimpan CORS configuration, **refresh halaman** SIMBAKES (Ctrl+F5 / Cmd+Shift+R)
2. Buka **Console Browser** (F12) → tab Console
3. Coba akses menu **"Data Existing Roadmap"**
4. Seharusnya muncul: `✅ Berhasil memuat X data roadmap (Supabase)`

---

## 🛠️ Troubleshooting

### Error masih muncul setelah konfigurasi CORS?

#### 1. Clear Browser Cache
- Chrome/Edge: Ctrl+Shift+Delete → Clear cache
- Firefox: Ctrl+Shift+Delete → Clear cache
- Lalu refresh dengan Ctrl+F5

#### 2. Cek RLS (Row Level Security) Policies
Pastikan tabel memiliki policy yang mengizinkan SELECT:

```sql
-- Cek existing policies
SELECT * FROM pg_policies WHERE tablename = 'roadmap_kebutuhan';

-- Jika kosong, tambahkan policy
CREATE POLICY "Enable read access for all users" 
ON public.roadmap_kebutuhan 
FOR SELECT 
USING (true);
```

#### 3. Verify API Key
Pastikan ANON KEY di `supabase-client.js` benar:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://boeknpvifamjmddsdopd.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Pastikan ini benar
};
```

#### 4. Test API Directly
Buka browser baru, ketik URL ini:
```
https://boeknpvifamjmddsdopd.supabase.co/rest/v1/roadmap_kebutuhan?select=*
```

Jika muncul JSON data → API bekerja, masalahnya di frontend
Jika muncul error/CORS block → Masalah konfigurasi CORS

---

## 📊 Diagram Alur CORS

```
┌─────────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│  GitHub Pages          │     │  Browser (Chrome/Firefox)│     │  Supabase API       │
│  simbakes.mukminnasri. │────▶│  Check CORS Policy       │────▶│  Database            │
│  com                    │     │                          │     │                     │
└─────────────────────────┘     └──────────────────────────┘     └─────────────────────┘
                                      │
                                      ▼
                              ┌──────────────────┐
                              │  CORS Check:      │
                              │  - Origin allowed?│
                              │  - Methods OK?    │
                              │  - Headers OK?    │
                              └──────────────────┘
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
                    ✅ ALLOWED                  ❌ BLOCKED
                    Data loaded                "Failed to fetch"
                                              Error shown
```

---

## 🎯 Quick Fix Checklist

- [ ] **CORS configured?** → Settings > API > CORS > Add domain
- [ ] **Domain correct?** → `https://simbakes.mukminnasri.com` (tanpa slash di akhir)
- [ ] **Table exists?** → Jalankan SQL schema di atas
- [ ] **RLS enabled?** → Pastikan ada SELECT policy
- [ ] **API key valid?** → Cek supabase-client.js
- [ ] **Cache cleared?** → Hard refresh browser
- [ ] **Network OK?** → Cek internet connection

---

## 📞 Bantuan Tambahan

Jika semua langkah di atas sudah dilakukan tapi masih error:

1. Screenshot error dari Console (F12)
2. Screenshot Network tab (F12 > Network > filter "supabase")
3. Kirim info:
   - Domain yang digunakan
   - Error message lengkap
   - Status CORS configuration (screenshot)

---

**Last Updated:** 2026-08-14  
**Version:** 1.0  
**For:** SIMBAKES v2.0 - Supabase Integration
