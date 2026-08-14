================================================================================
                    SIMBAKES - SISTEM INFORMASI BEASISWA KESEHATAN
                         Pemerintah Kabupaten Kutai Kartanegara
================================================================================

PAKET LENGKAP - Berdasarkan Template Excel v4 (Supabase Version)

--------------------------------------------------------------------------------
ISI PAKET:
--------------------------------------------------------------------------------

📁 sql/
   └── simbakes_schema.sql          → Schema database lengkap untuk Supabase
       • 4 Tabel: profiles, pengusulan, penetapan, roadmap_kebutuhan
       • Row Level Security (RLS) Policies
       • Storage Policies untuk upload dokumen
       • Auto-generate Nomor Pengajuan (SIM-YYYY-XXXXXX)
       • Trigger auto-sync ke tabel penetapan

📁 src/app/dashboard/
   ├── formulir-pengusulan/page.tsx → Formulir 21 field sesuai Excel
   ├── admin/page.tsx               → Panel Admin dengan manajemen penerima
   └── data-penetapan/page.tsx      → Halaman data penerima beasiswa

📁 src/lib/supabase/
   ├── client.ts                    → Supabase browser client
   └── server.ts                    → Supabase server client

📁 src/lib/
   └── auth.ts                      → Helper functions autentikasi

📁 src/providers/
   └── AuthProvider.tsx             → Context provider auth & RBAC

📁 upload/
   └── template_simbakes versi supabase (4).xlsx
        → Template Excel referensi (4 sheet, 500+ baris data)

--------------------------------------------------------------------------------
STRUKTUR DATABASE (Berdasarkan Excel):
--------------------------------------------------------------------------------

1. TABLE: profiles (dari sheet "multiusers")
   - id, user_id, nama_lengkap, username, email, status, role, nik

2. TABLE: pengusulan (dari sheet "data_pengusulan" - 21 kolom)
   - Data Pribadi: nik, nama_lengkap, tempat_lahir, tanggal_lahir
   - Alamat: alamat_ktp, alamat_domisili, lama_domisili_tahun
   - Pekerjaan: pekerjaan, posisi_jabatan, unit_kerja
   - Narasi: penjelasan_narasi
   - Pendidikan: jurusan_tujuan, jenjang_pendidikan, unit_tujuan_pemanfaatan,
                 rencana_tahun_studi
   - Kontak: no_hp, no_whatsapp, email
   - Dokumen: pasfoto, dokumen
   - Status & Timestamps

3. TABLE: penetapan (dari sheet "data_penetapan" - 13 kolom)
   - Core Data + SK Penetapan + Dokumen Links + Periode

4. TABLE: roadmap_kebutuhan (dari sheet "roadmap_kebutuhan" - 9 kolom)
   - jurusan, kualifikasi_awal, jenis_pendidikan, perguruan_tinggi,
     pekerjaan, tahun_mulai_studi, unit_pendayaguna, status, nama_penerima

--------------------------------------------------------------------------------
CARA PENGGUNAAN:
--------------------------------------------------------------------------------

1. SETUP SUPABASE:
   • Buat project baru di https://supabase.com
   • Buka SQL Editor di dashboard Supabase
   • Copy-paste seluruh isi file: sql/simbakes_schema.sql
   • Execute SQL untuk membuat semua tabel dan policies

2. KONFIGURASI ENVIRONMENT:
   • Copy .env.example ke .env
   • Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY

3. IMPORT DATA EXCEL (Opsional):
   • Gunakan template_simbakes versi supabase (4).xlsx sebagai referensi
   • Import data existing jika diperlukan

4. jalankan APLIKASI:
   npm run dev     # Development mode
   npm run build   # Production build
   npm start       # Start production server

--------------------------------------------------------------------------------
FITUR UTAMA:
--------------------------------------------------------------------------------

✅ Formulir Pengajuan Beasiswa (21 field lengkap)
✅ Upload dokumen ke Supabase Storage (KTP, KTM, Transkrip, Pas Foto)
✅ Panel Admin dengan RBAC (Role-Based Access Control)
✅ Manajemen Status: Diproses → Diterima/Ditolak
✅ Auto-sync ke tabel Penetapan saat diterima
✅ Generate Nomor Pengajuan Otomatis (SIM-YYYY-XXXXXX)
✅ Data Penetapan dengan SK Number
✅ Roadmap Kebutuhan SDM Kesehatan
✅ Responsive Design (Mobile-friendly)

--------------------------------------------------------------------------------
TEKNOLOGI:
--------------------------------------------------------------------------------

• Frontend: Next.js 16 (App Router) + TypeScript
• Styling: Tailwind CSS + shadcn/ui
• Icons: Lucide React
• Database: Supabase (PostgreSQL)
• Auth: Supabase Auth (@supabase/ssr)
• Storage: Supabase Storage
• Notifications: Sonner (Toast)

--------------------------------------------------------------------------------
DIBUAT OLEH:
--------------------------------------------------------------------------------
TIM IT DINAS KESEHATAN
PEMERINTAH KABUPATEN KUTAI KARTANEGARA
PROVINSI KALIMANTAN TIMUR

© 2026 SIMBAKES - Sistem Informasi Beasiswa Kesehatan
================================================================================
