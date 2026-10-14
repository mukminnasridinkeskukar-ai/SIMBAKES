# PANDUAN — FILE SIMBAKES KE BACKBLAZE B2 (TANPA KARTU KREDIT)

> Revisi 15 Okt b — Alternatif Cloudflare R2 untuk Anda yang **terhalang
> permintaan kartu kredit** saat aktivasi R2. **Backblaze B2 tidak meminta
> kartu sama sekali**: 10 GB gratis, unduh/traffic gratis s.d. 3× kapasitas
> per bulan. Database tetap 100% Supabase — tidak ada SQL, tidak ada
> migrasi data. Kode aplikasi TIDAK berubah (konfigurasi tetap 4 baris
> di `js/r2-config.js`).

---

## ⚠️ MASIH DIMINTA PEMBAYARAN? Periksa 3 hal ini dulu

**1) pastikan Anda mendaftar di halaman produk yang TEPAT.**
Backblaze punya 2 produk berbeda dan halaman depannya menonjolkan yang
berbayar:

| Produk | Harga | Kartu? | Ciri di layar |
|---|---|---|---|
| ❌ **Computer Backup** (personal PC/Mac) | ~$9/bulan | **Ya, dibayar** | "Backblaze Computer Backup", backup komputer pribadi |
| ✅ **B2 Cloud Storage** (penyimpanan file — YANG DIPAKAI SIMBAKES) | 10 GB gratis | **Tidak** | "B2 Cloud Storage" / "Try B2 for Free" |

Buka langsung tautan pendaftaran B2 yang benar:

> **https://www.backblaze.com/sign-up/cloud-storage**

Di halaman itu tertulis resmi: **"No credit card required"**. Cukup email.

**2) selama proses, abaikan setiap ajakan upgrade.** Dashboard B2 kadang
menampilkan banner "Add payment method" / "Select a plan" untuk fitur
tertentu — itu opsional, bisa ditutup/dilewati. Yang wajib hanya:
buat bucket → buat Application Key (Langkah 2–3). Tidak ada langkah
wajib yang menagih kartu.

**3) jangan ikuti panduan R2 yang lama.** Aktivasi R2 di Cloudflare
memang **selalu** meminta kartu — itu kebijakan Cloudflare, bukan
kesalahan langkah Anda. Jalur B2 ini tidak memakai R2 sama sekali;
Worker Cloudflare-nya pun gratis tanpa kartu.

---

## Arsitektur (sama seperti rencana R2)

```
Browser SIMBAKES ──upload──▶ Cloudflare Worker (gratis, tanpa kartu)
                                   │
                                   └──simpan──▶ Backblaze B2 (10 GB gratis, tanpa kartu)
                                   └──URL publik──▶ database Supabase (tetap)
```

Anda memakai 2 layanan gratis: **Cloudflare Workers** (penghubung) +
**Backblaze B2** (penyimpanan file). Keduanya tidak perlu kartu kredit.

---

## Langkah pemasangan (±25 menit)

### Langkah 1 — Daftar Backblaze B2

1. Buka **https://www.backblaze.com/sign-up/cloud-storage** (halaman resmi
   B2 — tertulis **"No credit card required"**) → isi email → daftar.
   ⚠️ Jangan klik produk **"Computer Backup"** — itu produk berbayar yang
   berbeda dan justru meminta pembayaran. Yang benar: **B2 Cloud Storage**.
2. Verifikasi email bila diminta.

### Langkah 2 — Buat bucket

1. Masuk dashboard → menu **B2 Cloud Storage** → **Buckets** → **Create a Bucket**.
2. Nama: `simbakes-files` (harus unik global — bila sudah dipakai orang,
   tambah angka, mis. `simbakes-files-dinkes02`).
3. **Files in Bucket are:** pilih **Public** ← penting agar file tampil.
4. Create. **Catat: Bucket Name** (mis. `simbakes-files`).

### Langkah 3 — Ambil kunci aplikasi (App Key)

1. Menu **Application Keys** → **Add a New Application Key**.
2. Name: `simbakes-worker` → **Allow access to Bucket(s):** pilih
   `simbakes-files` saja → type of access: **Read and Write** →
   Create New Key.
3. **Catat dua nilai ini (hanya tampil sekali!):**
   - **keyID** → ini `B2_KEY_ID`
   - **applicationKey** → ini `B2_APP_KEY`
4. Ambil **Bucket ID**: menu Buckets → baris `simbakes-files` → kolom
   **Bucket ID** (mis. `a1b2c3d4e5f6...`) → ini `B2_BUCKET_ID`.

### Langkah 4 — Catat URL baca publik

Bentuk URL file B2:
`https://fNNN.backblazeb2.com/file/<NAMA-BUCKET>/<path-file>`

Angka `fNNN` berbeda tiap akun (f000, f001, f002, ...). Cara pasti:
upload 1 file percobaan dari dashboard (bucket → **Upload/Delete Files**
→ drag file apa pun), lalu klik file itu dan salin **Friendly URL**-nya.
Bagian sebelum `/file/...` → itu `publicBase`
(contoh: `https://f001.backblazeb2.com/file/simbakes-files`).
Hapus file percobaan itu setelahnya.

### Langkah 5 — Buat Cloudflare Worker (TANPA kartu)

1. Dashboard Cloudflare (akun gratis, [dash.cloudflare.com](https://dash.cloudflare.com))
   → **Compute (Workers)** → **Create** → **Create Worker** →
   nama `simbakes-upload` → Deploy.
2. **Edit code** → hapus isi bawaan → tempel seluruh isi
   `cloudflare/worker-simbakes-upload.js` → **Deploy**.
3. **Settings** → **Variables & Secrets** — isi:

   | Tipe | Nama | Nilai |
   |---|---|---|
   | Text/Plain | `STORAGE_BACKEND` | `b2` |
   | Text/Plain | `B2_KEY_ID` | keyID dari Langkah 3 |
   | **Secret** | `B2_APP_KEY` | applicationKey dari Langkah 3 |
   | Text/Plain | `B2_BUCKET_ID` | Bucket ID dari Langkah 3 |
   | Text/Plain | `B2_BUCKET_NAME` | nama bucket dari Langkah 2 |
   | **Secret** | `UPLOAD_TOKEN` | token acak panjang (buat sendiri, min. 32 karakter) |

4. Buka URL Worker → `/health` → harus muncul
   `{"ok":true,"backend":"b2"}` ✅

### Langkah 6 — Isi konfigurasi aplikasi

Edit `js/r2-config.js` di SIMBAKES (nama filenya memang masih r2 —
isinya berlaku untuk B2 juga):

```js
var R2_CONFIG = {
    enabled: true,                                             // ← aktifkan
    uploadUrl: 'https://simbakes-upload.<akun>.workers.dev',   // ← URL Worker
    publicBase: 'https://fNNN.backblazeb2.com/file/simbakes-files', // ← Langkah 4
    token: 'UPLOAD-TOKEN-DARI-LANGKAH-5'                       // ← sama dgn UPLOAD_TOKEN
};
```

Upload file aplikasi ke hosting — **selesai**.

### Langkah 7 — Uji

| Uji | Cara | Hasil yang benar |
|---|---|---|
| Worker hidup | `https://...workers.dev/health` | `{"ok":true,"backend":"b2"}` |
| Upload pengajuan | Peserta → Ajukan Rekomendasi → kirim | Sukses; di dashboard B2 bucket muncul folder `pengajuan/...` |
| Tampil di admin | Admin → Data Pengusulan → buka data baru | Foto/dokumen terbuka (URL `backblazeb2.com`) |
| File lama | Buka data lama (URL supabase) | Tetap tampil normal |

---

## Pertanyaan yang mungkin muncul

**Apakah benar tanpa kartu?** Ya. Pendaftaran B2 hanya email; kuota gratis:
10 GB penyimpanan + 1 GB unduhan/hari (egress gratis s.d. 3× kapasitas/bulan).
Untuk skala layanan ini sangat longgar. Jika suatu saat melewati 10 GB,
tarifnya $6/TB/bulan tanpa biaya minimum.

**Apakah Worker Cloudflare-nya minta kartu?** Tidak. Pembuatan Worker di
paket gratis tidak meminta pembayaran — yang minta kartu hanya aktivasi R2.

**Amankah?** Worker memakai token, hanya menerima folder `pengajuan/`,
`rekomendasi/`, `profil/`, hanya PDF/JPG/PNG/WEBP, maks 10 MB, tanpa
menimpa file, menolak `..` (path traversal). Kredensial B2 hanya ada di
Worker (secret), tidak pernah dikirim ke browser.

**Bedanya dengan panduan R2?** Hanya backend penyimpanan di Worker dan
nilai variable-nya. Kode aplikasi, `r2-config.js`, dan skrip migrasi
(`cloudflare/migrate-supabase-to-r2.mjs`) semuanya sama — skrip migrasi
file lama juga bekerja lewat Worker, jadi bisa dipakai untuk memindahkan
file lama ke B2 juga.

**Mau pindah dari B2 ke R2 nanti?** Ubah `STORAGE_BACKEND` menjadi `r2`
+ isi binding BUCKET — tanpa menyentuh aplikasi (URL lama tetap tampil;
file baru masuk R2).

## Rollback darurat (5 detik)

`js/r2-config.js` → `enabled: false` → upload ulang file itu. Aplikasi
kembali 100% ke Supabase Storage.
