# 🚀 SIMBAKES - Supabase Integration (COMPLETE)

## ✅ STATUS: GOOGLE SHEETS DIGANTI 100% DENGAN SUPABASE

File-file dalam package ini telah dikonfigurasi untuk **mengganti SEMUA fungsi Google Sheets** dengan **Supabase** sebagai backend database.

---

## 📦 File Package

```
simbakes-supabase-package/
├── 📄 index.html                  ← Template UTAMA (sudah terintegrasi)
├── 📄 supabase-client.js          ← Koneksi ke Supabase
├── 📄 simbakes-integration.js     ← OVERRIDE fungsi Google Sheets (v3.0)
├── 📄 simbakes_supabase_schema.sql← Database schema (4 tabel)
└── 📄 README-SUPABASE-INTEGRATION.md ← File ini
```

---

## 🔧 FUNGSI YANG DI-OVERRIDE (Google Sheets → Supabase)

| # | Fungsi Original | Status | Keterangan |
|---|----------------|--------|------------|
| 1 | `apiFetch()` | ✅ DI-GANTI | Semua fetch ke Google Apps Script → Supabase |
| 2 | `renderDashboard()` | ✅ DI-GANTI | Load dashboard dari view Supabase |
| 3 | `fetchDashboardStats()` | ✅ DI-GANTI | Stats dari tabel/view Supabase |
| 4 | `fetchRecentSubmissions()` | ✅ DI-GANTI | Data terbaru dari data_pengusulan |
| 5 | `fetchVisitorStats()` | ✅ DI-GANTI | Local storage (opsional) |
| 6 | `trackVisitorToSheets()` | ✅ DI-GANTI | Local tracking (tanpa Google) |
| 7 | `sendToGoogleSheets()` | ✅ DI-GANTI | INSERT ke tabel Supabase |
| 8 | `loadDataPengusul()` / `fetchAdminData()` | ✅ DI-GANTI | Admin data dari Supabase |
| 9 | `updateAdminStats()` | ✅ DI-GANTI | Stats breakdown dari Supabase |
| 10 | `refreshDashboard()` | ✅ DI-GANTI | Refresh dari Supabase |
| 11 | `handleLogin()` | ✅ DI-GANTI | Auth via multiusers table |
| 12 | `handleLogout()` | ✅ DI-GANTI | Clear session Supabase |
| 13 | Export/Import functions | ✅ DI-GANTI | CSV export dari Supabase |

---

## 🗃️ Struktur Database Supabase

### Tabel (dari Excel):

1. **multiusers** (6 kolom)
   - id, nama_lengkap, username, password, email, status, role
   - Data default: superadmin, admin, operator

2. **data_pengusulan** (21 kolom)
   - nik, nama_lengkap, alamat, jurusan, status, dokumen, dll
   - Target: 97 rows dari Excel

3. **data_penetapan** (13 kolom)
   - nik, no_sk_penetapan, status_penetapan, periode, dll
   - Target: 18 rows dari Excel

4. **roadmap_kebutuhan** (10 kolom)
   - kode, jurusan, pekerjaan, unit_pendayaguna, status, dll

### Views:
- `v_dashboard_stats` - Statistik dashboard
- `v_pengusulan_full` - Join pengusulan + penetapan

---

## 🚀 Setup Cepat (5 Langkah)

### Langkah 1: Buat Project Supabase
1. Buka [https://supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Isi nama: `simbakes-database`
4. Copy **Project URL** dan **anon key**

### Langkah 2: Jalankan SQL Schema
1. Di dashboard Supabase, buka **SQL Editor**
2. Copy isi file `simbakes_supabase_schema.sql`
3. Paste dan klik **Run**

### Langkah 3: Konfigurasi CORS
1. Buka **Settings** > **API**
2. Di bagian **URL Configuration**, tambahkan:
   ```
   https://[username].github.io
   http://localhost:3000
   http://localhost:5500
   ```

### Langkah 4: Edit Credential Client
Buka `supabase-client.js`, ganti baris 19-20:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co',  // GANTI!
    anonKey: 'YOUR_ANON_KEY_HERE'                   // GANTI!
};
```

### Langkah 5: Deploy ke GitHub Pages
```bash
# Upload semua file ke repository GitHub
# Aktifkan GitHub Pages di Settings > Pages
# Akses: https://username.github.io/repo-name/
```

---

## 📊 Alur Data (Setelah Integrasi)

```
BEFORE (Google Sheets):
┌─────────────┐     fetch()      ┌──────────────────────┐
│  index.html │ ──────────────>  │  Google Apps Script   │
│  (frontend) │                  │  (Web App URL)        │
└─────────────┘                  └──────────────────────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │ Google Sheets │
                                 │ (Spreadsheet) │
                                 └──────────────┘


AFTER (Supabase):
┌─────────────┐    supabase-js    ┌──────────────────────┐
│  index.html │ ──────────────>  │  Supabase API         │
│  (frontend) │                  │  (PostgreSQL)         │
└─────────────┘                  └──────────────────────┘
                                        │
                                        ▼
                                 ┌──────────────────────┐
                                 │  data_pengusulan      │
                                 │  data_penetapan       │
                                 │  roadmap_kebutuhan    │
                                 │  multiusers           │
                                 └──────────────────────┘
```

---

## ✅ Fitur yang Tersedia

| Fitur | Status | Source Data |
|-------|--------|-------------|
| Login/Logout | ✅ Active | Supabase multiusers |
| Dashboard Stats | ✅ Active | Supabase v_dashboard_stats |
| Data Pengusulan (CRUD) | ✅ Active | Supabase data_pengusulan |
| Data Penetapan | ✅ Active | Supabase data_penetapan |
| Roadmap Kebutuhan | ✅ Active | Supabase roadmap_kebutuhan |
| Search & Filter | ✅ Active | Supabase queries |
| Pagination | ✅ Active | Supabase range queries |
| Export CSV/Excel | ✅ Active | Supabase data export |
| Photo Display | ✅ Active | URL from Supabase |
| Document Links | ✅ Active | URL from Supabase |
| Visitor Tracking | ✅ Active | LocalStorage (optional) |

---

## 🔒 Keamanan

### Row Level Security (RLS) Aktif:
- ✅ Superadmin: Full access
- ✅ Admin: Read/Write pengusulan & penetapan
- ✅ Operator: Read only + Insert pengusulan
- ✅ Public: No access (authenticated only)

### Best Practices:
- ✅ Anon key saja di client (tidak service_role)
- ✅ Password hashed (production gunakan bcrypt)
- ✅ Input validation di frontend + backend
- ✅ HTTPS enforced (GitHub Pages)

---

## 🐛 Troubleshooting

### Masalah: "Supabase belum dikonfigurasi"
**Solusi**: Edit `supabase-client.js`, isi URL dan Anon Key

### Masalah: "CORS policy blocked"
**Solusi**: Tambahkan domain GitHub Pages di Settings > API > URL Configuration

### Masalah: "relation does not exist"
**Solusi**: Jalankan ulang SQL schema di SQL Editor

### Masalah: "new row violates row-level security policy"
**Solusi**: User harus login dulu sebelum CRUD operations

### Masalah: Data tidak muncul
**Solusi**: 
1. Buka browser console (F12)
2. Cek log `[SIMBAKES]`
3. Pastikan tidak ada error merah

---

## 📈 Demo Mode (Tanpa Supabase)

Jika Supabase belum dikonfigurasi, sistem akan otomatis:
- Menampilkan **status warning** oranye
- Menggunakan **data dummy**
- Menampilkan pesan: *"Mode Demo - Hubungkan ke Supabase untuk production"*

**Login Demo:**
| Username | Password | Role |
|----------|----------|------|
| superadmin | `Aida2007###` | Super Admin |
| operator2 | `EtaSDMK2024@` | Admin |
| admin | `admin123` | Admin |
| operator | `operator123` | Operator |

---

## 🔄 Perbandingan: Google Sheets vs Supabase

| Aspek | Google Sheets (LAMA) | Supabase (BARU) |
|-------|---------------------|-----------------|
| **Latency** | Tinggi (2-10 detik) | Rendah (<500ms) |
| **Concurrency** | Maks 30 user | Unlimited |
| **Security** | Rendah | Tinggi (RLS) |
| **Reliability** | Bergantung Google | Enterprise grade |
| **CRUD Operations** | Terbatas | Full SQL |
| **Scalability** | 50,000 rows | Unlimited |
| **Real-time** | Tidak | Ya (Realtime engine) |
| **Cost** | Free (terbatas) | Free (50MB) |
| **Maintenance** | Manual script | Auto backup |

---

## 🎯 Checklist Go-Live

- [ ] SQL schema berhasil dijalankan tanpa error
- [ ] CORS dikonfigurasi dengan benar
- [ ] `supabase-client.js` sudah diisi credential
- [ ] Template HTML berfungsi normal
- [ ] Login/logout berhasil dengan akun Supabase
- [ ] CRUD operations bekerja
- [ ] Data tampil di dashboard
- [ ] Export/Import berfungsi
- [ ] Mobile responsive OK
- [ ] Browser console bersih dari error

---

## 📞 Support

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Supabase Discord**: [discord.supabase.com](https://discord.supabase.com)
- **GitHub Issues**: Report bugs di repository Anda

---

## 📝 Changelog

### v3.0 (Current)
- ✅ Override 13+ fungsi Google Sheets
- ✅ Complete Supabase integration
- ✅ Fallback demo mode
- ✅ Enhanced error handling
- ✅ Visitor tracking (local)
- ✅ Export/CSV functionality
- ✅ Authentication integration

---

**🎉 SELAMAT! SIMBAKES ANDA SUDAH TERHUBUNG KE SUPABASE!**

Data sekarang **100% dari Supabase**, bukan lagi Google Sheets! 🚀
