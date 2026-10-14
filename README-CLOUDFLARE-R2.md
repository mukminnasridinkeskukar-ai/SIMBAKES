# PANDUAN — FILE SIMBAKES KE CLOUDFLARE R2 (database tetap Supabase)

> 🚫 **PENTING — BACA DULU (terverifikasi 15 Okt)**
> **Cloudflare R2 TIDAK BISA diaktifkan tanpa kartu kredit/debit.**
> Saat menekan "Purchase R2", Cloudflare SELALU meminta menambah metode
> pembayaran — bahkan untuk kuota gratis 10 GB. Ini kebijakan wajib
> Cloudflare (R2 adalah layanan *metered*), **tidak ada cara melewatinya**.
> Jika Anda tidak punya kartu: **BERHENTI dari panduan ini** — jangan ulangi
> mencoba, hasilnya pasti sama.
>
> ▶ **Gunakan jalur TANPA kartu: `README-BACKBLAZE-B2.md`**
> (Backblaze B2 — pendaftaran resmi "No credit card required", 10 GB gratis,
> kode aplikasi & konfigurasi sama persis; hanya backend Worker yang beda).
> ▶ Atau tetap di Supabase tanpa layanan baru: aplikasi default
> `enabled:false` sudah 100% berfungsi seperti biasa.

> Revisi 15 Okt — Penyimpanan **file dokumen/foto** dipindah ke **Cloudflare R2**
> (gratis 10 GB, unduh/traffic gratis), sementara **database tetap 100% Supabase**.
> Tidak ada perubahan tabel, tidak ada migrasi data, tidak ada SQL baru.

---

## 1. Apa yang berubah?

| Aspek | Sebelum | Sesudah |
|---|---|---|
| Database (submissions, akun_peserta, login, RPC) | Supabase | **Supabase (tetap)** |
| Upload foto KTP, dokumen, surat (form pengajuan) | Supabase Storage | **Cloudflare R2** |
| Upload rekomendasi dinkes (panel admin) | Supabase Storage | **Cloudflare R2** |
| Foto profil peserta | Supabase Storage | **Cloudflare R2** |
| File lama yang sudah terlanjur di Supabase | — | Tetap tersimpan & tampil normal (kompatibel otomatis) |
| Kapasitas file | 1 GB (Supabase free) | **10 GB gratis + traffic unduh tanpa biaya** |

Alur teknis: browser mengirim file ke **Cloudflare Worker** kecil (kode sudah
disediakan di `cloudflare/worker-simbakes-upload.js`) yang menyimpannya ke
bucket R2 dan mengembalikan URL publik. URL itulah yang disimpan ke database
Supabase seperti biasa.

---

## 2. Yang Anda siapkan (±20 menit, semua lewat dashboard web)

1. Akun Cloudflare (gratis) — [dash.cloudflare.com](https://dash.cloudflare.com)
2. Satu bucket R2 bernama `simbakes-files`
3. Satu Worker bernama `simbakes-upload`
4. Satu token rahasia (string acak — cara membuatnya di langkah 3)

---

## 3. Langkah pemasangan

### Langkah 1 — Buat bucket R2

1. Login ke dashboard Cloudflare → menu kiri **R2 Object Storage**.
   ⚠️ Di langkah inilah Cloudflare **mewajibkan kartu kredit/debit**
   ("Purchase R2" → *Add payment method*). **Tanpa kartu, langkah ini
   tidak bisa diselesaikan** — berhenti dan gunakan README-BACKBLAZE-B2.md.
   (Dengan kartu: tetap gratis untuk paket free 10 GB selama kuota
   tidak terlampaui.)
2. **Create bucket** → nama: `simbakes-files` → Location: **APAC** → Create.
3. Masuk ke bucket itu → tab **Settings** → cari **Public access** →
   **Allow Access** (aktifkan akses publik / r2.dev subdomain).
   Cloudflare menampilkan URL publik seperti:
   `https://pub-xxxxxxxxxxxxxxxx.r2.dev`
   **Catat URL ini** → inilah `publicBase` (URL baca file).

### Langkah 2 — Buat token rahasia

Buat string acak panjang (min. 32 karakter). Cara mudah: buka
[passwordgenerator.online-toolz.com](https://passwordgenerator.herokuapp.com/)
atau jalankan di browser console:
`crypto.randomUUID() + crypto.randomUUID()`
(digabung tanpa spasi). **Simpan** — dipakai di 2 tempat (Worker & r2-config.js).

### Langkah 3 — Buat Worker

1. Dashboard Cloudflare → menu kiri **Compute (Workers)** → **Create** →
   **Create Worker** → nama: `simbakes-upload` → **Deploy**.
2. Klik **Edit code** → hapus semua kode bawaan → **tempel seluruh isi file
   `cloudflare/worker-simbakes-upload.js`** dari paket ini → **Deploy**.
3. Kembali ke Worker → **Settings** → **Variables & Secrets**:

   | Tipe | Nama | Nilai |
   |---|---|---|
   | R2 Bucket (binding) | `BUCKET` | pilih `simbakes-files` |
   | Secret | `UPLOAD_TOKEN` | token rahasia dari Langkah 2 |
   | Text/Plain | `R2_PUBLIC_BASE` | URL publik bucket dari Langkah 1 (mis. `https://pub-xxxx.r2.dev`) |

4. Buka URL Worker (tampak di halaman Worker, bentuknya
   `https://simbakes-upload.<akun>.workers.dev`) → tambahkan `/health`
   di akhir → harus muncul: `{"ok":true,...}` ✅

### Langkah 4 — Aktifkan di aplikasi SIMBAKES

Edit **satu file**: `js/r2-config.js`

```js
var R2_CONFIG = {
    enabled: true,                                             // ← false → true
    uploadUrl: 'https://simbakes-upload.<akun>.workers.dev',   // ← URL Worker
    publicBase: 'https://pub-xxxxxxxx.r2.dev',                 // ← URL publik bucket
    token: 'TOKEN-RAHASIA-DARI-LANGKAH-2'                      // ← sama dgn UPLOAD_TOKEN
};
```

Tanpa garis miring di akhir URL. Upload file aplikasi ke hosting — selesai.

### Langkah 5 — Uji

| Uji | Cara | Hasil yang benar |
|---|---|---|
| Worker hidup | Buka `https://...workers.dev/health` | `{"ok":true}` |
| Upload pengajuan | Login peserta → Ajukan Rekomendasi → pilih 3 file → kirim | Sukses; bukti terbit; di dashboard R2 bucket muncul file baru di folder `pengajuan/...` |
| Data tersimpan | Panel admin → Data Pengusulan → buka data baru | Tautan foto & dokumen terbuka (URL `pub-xxxx.r2.dev`) |
| Rekomendasi dinkes | Admin → Edit data → upload file rekomendasi | Tersimpan & tampil |
| Foto profil | Peserta → Profil → ganti foto | Tersimpan & avatar terbarui |
| Mode lama aman | Buka data lama (URL supabase.co) | Tetap tampil normal |

---

## 4. File lama di Supabase — mau dipindah juga?

Tidak wajib (otomatis tetap tampil). Jika ingin memindahkan agar kuota
Supabase Storage lega:

1. Jalankan skrip migrasi (opsional) — lihat bagian di bawah.
2. Pastikan semua URL di database sudah diganti sebelum menghapus file lama.

Skrip: `cloudflare/migrate-supabase-to-r2.mjs` (memerlukan Node.js; jalankan
sekali di komputer Anda — panduan lengkap ada di kepala file skripnya).

---

## 5. Catatan keamanan

- Token di `js/r2-config.js` ikut terunduh ke browser pengunjung — bukan
  rahasia mutlak. Fungsinya mencegah penyalahgunaan kasar. Pengaman sesungguhnya
  ada di Worker: **hanya folder tertentu** (`pengajuan/`, `rekomendasi/`,
  `profil/`), **hanya PDF/JPG/PNG/WEBP**, **maks 10 MB**, tanpa timpa file,
  tanpa akses keluar folder (blokir `..`).
- Tingkat keterbukaan ini SAMA dengan kondisi sebelumnya (anon key Supabase
  juga terekspos di browser) dan sesuai model keamanan aplikasi ini.
- Worker dapat dikunci lebih ketat lagi (CORS per-domain, rate limit) —
  minta bantuan pengembang bila diperlukan.

## 6. Rollback (darurat, 5 detik)

Edit `js/r2-config.js` → `enabled: false` → upload ulang file itu saja.
Aplikasi kembali 100% ke Supabase Storage; file yang sudah masuk R2 tetap
tampil karena URL-nya absolut tersimpan di database.

## 7. Kuota & biaya R2 (paket free)

| Komponen | Gratis/bulan |
|---|---|
| Penyimpanan file | 10 GB |
| Operasi tulis (upload) | 1 juta kali |
| Operasi baca (tampil file) | 10 juta kali |
| Traffic unduh (egress) | **Tanpa biaya** |
| Worker (request) | 100 ribu/hari |

Untuk skala layanan kesehatan daerah, paket gratis ini sangat longgar.
