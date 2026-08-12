# 📁 SIMBAKES - Rancangan Penyimpanan File (Storage Design)

## Beasiswa Tematik Bidang Kesehatan - Supabase Storage

---

## Sumber Data:
- **File Excel:** `template_simbakes versi supabase (2).xlsx`
- **Sheet:** data_pengusulan
- **Field File:** `pasfoto`, `dokumen`

---

## A. BUCKET SUPABASE STORAGE YANG DIPERLUKAN

### Rekomendasi: 1 Bucket Utama

| Aspek | Keterangan |
|-------|------------|
| **Nama Bucket** | `simbakes` |
| **Fungsi** | Menyimpan semua file terkait SIMBAKES |
| **Alasan 1 bucket** | Sederhana, mudah dikelola, cukup untuk skala ini |
| **Public Access** | Ya (untuk file yang perlu diakses publik) |
| **Allowed MIME** | Dibatasi (lihat bagian C) |
| **Max File Size** | Dibatasi (lihat bagian D) |

### Struktur Bucket:

```
supabase/storage/v1/object/public/simbakes/
│
├── pasfoto/                    ← Folder untuk pasfoto pelamar
│   ├── {nik}/                  ← Subfolder per NIK (1 folder = 1 pelamar)
│   │   └── {filename}.jpg      ← File pasfoto
│
└── dokumen/                    ← Folder untuk dokumen pendukung
    ├── {nik}/                  ← Subfolder per NIK
    │   ├── {filename}.pdf      ← Dokumen PDF
    │   ├── {filename}.jpg      ← Dokumen gambar (jika ada)
    │   └── ...                 ← Dokumen lainnya
```

### Alternatif: 2 Bucket Terpisah (Jika Diperlukan)

Jika Anda ingin pemisahan ketat antara foto dan dokumen:

| Bucket | Nama | Isi | Public? |
|--------|------|-----|---------|
| Bucket 1 | `simbakes-pasfoto` | Hanya pasfoto | ✅ Ya |
| Bucket 2 | `simbakes-dokumen` | Hanya dokumen pendukung | ❌ Tidak (opsional) |

> **Rekomendasi:** Gunakan **1 bucket (`simbakes`)** dengan struktur folder yang jelas.
> Lebih sederhana dan cukup untuk kebutuhan SIMBAKES.

---

## B. STRUKTUR FOLDER PENYIMPANAN FILE

### Hierarki Lengkap:

```
simbakes/                          ← Root Bucket
│
├── pasfoto/                       ← Kategori: Pas Foto
│   │
│   ├── 3201234567890001/          ← Folder berdasarkan NIK pelamar
│   │   ├── pasfoto_3201234567890001.jpg
│   │   └── pasfoto_3201234567890001_thumb.jpg     (opsional thumbnail)
│   │
│   ├── 3201234567890002/
│   │   └── pasfoto_3201234567890002.png
│   │
│   └── 3201234567890003/
│       └── pasfoto_3201234567890003.jpeg
│
│
└── dokumen/                       ← Kategori: Dokumen Pendukung
    │
    ├── 3201234567890001/          ← Folder berdasarkan NIK pelamar
    │   ├── ktp_3201234567890001.pdf
    │   ├── ijazah_3201234567890001.pdf
    │   ├── surat_rekomendasi_3201234567890001.pdf
    │   └── dokumen_lain_3201234567890001.pdf
    │
    ├── 3201234567890002/
    │   ├── ktp_3201234567890002.pdf
    │   └── ijazah_3201234567890002.pdf
    │
    └── 3201234567890003/
        ├── ktp_3201234567890003.pdf
        └── dokumen_pendukung_3201234567890003.zip
```

### Konvensi Naming File:

| Jenis File | Pattern Nama | Contoh |
|------------|--------------|--------|
| PasFoto | `pasfoto_{nik}.{ext}` | `pasfoto_3201234567890001.jpg` |
| KTP | `ktp_{nik}.{ext}` | `ktp_3201234567890001.pdf` |
| Ijazah | `ijazah_{nik}.{ext}` | `ijazah_3201234567890001.pdf` |
| Surat Rekomendasi | `surat_rekomendasi_{nik}.{ext}` | `surat_rekomendasi_3201234567890001.pdf` |
| Dokumen Lain | `dokumen_lain_{nik}_{timestamp}.{ext}` | `dokumen_lain_3201234567890001_20250109.pdf` |

### Keuntungan Struktur Ini:

1. **Organized by NIK** - Mudah mencari semua file 1 pelamar
2. **Scalable** - Tidak ada limit praktis jumlah folder
3. **Easy Cleanup** - Hapus 1 folder NIK = hapus semua file pelamar tersebut
4. **Path Predictable** - Path bisa dibangun dari NIK saja
5. **No Conflict** - Nama file unik per NIK

---

## C. ATURAN TIPE FILE (MIME TYPES)

### Field: `pasfoto`

| Aturan | Nilai |
|--------|-------|
| **Tipe yang Diizinkan** | Image only |
| **MIME Types** | `image/jpeg`, `image/png`, `image/webp` |
| **Ekstensi File** | `.jpg`, `.jpeg`, `.png`, `.webp` |
| **Tipe yang DILARANG** | `.gif`, `.bmp`, `.svg`, `.tiff`, file non-image |

### Field: `dokumen`

| Aturan | Nilai |
|--------|-------|
| **Tipe yang Diizinkan** | Document + Image (scan) |
| **MIME Types** | `application/pdf`, `image/jpeg`, `image/png` |
| **Ekstensi File** | `.pdf`, `.jpg`, `.jpeg`, `.png` |
| **Tipe yang DILARANG** | `.exe`, `.js`, `.html`, `.zip` (kecuali disetujui), `.doc`, `.xls` |

### Validasi MIME Types (untuk implementasi):

```javascript
// Allowed MIME types configuration
const ALLOWED_MIME_TYPES = {
  pasfoto: [
    'image/jpeg',
    'image/png', 
    'image/webp'
  ],
  dokumen: [
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]
};

// Allowed extensions
const ALLOWED_EXTENSIONS = {
  pasfoto: ['.jpg', '.jpeg', '.png', '.webp'],
  dokumen: ['.pdf', '.jpg', '.jpeg', '.png']
};
```

---

## D. ATURAN UKURAN FILE

### Field: `pasfoto`

| Aturan | Nilai | Alasan |
|--------|-------|--------|
| **Ukuran Maksimum** | **2 MB** (2,097,152 bytes) | Cukup untuk foto berkualitas tinggi |
| **Ukuran Minimum** | **10 KB** | Mencegah file corrupt/kosong |
| **Resolusi Ideal** | Min 300x400 px (3:4 ratio) | Standar pasfoto Indonesia |
| **Resolusi Maks** | 2000x2000 px | Tidak perlu terlalu besar |
| **Kompresi** | Disarankan JPEG quality 80-90% | Optimasi ukuran |

### Field: `dokumen`

| Aturan | Nilai | Alasan |
|--------|-------|--------|
| **Ukuran Maksimum per file** | **5 MB** (5,242,880 bytes) | Standar dokumen PDF |
| **Ukuran Total per NIK** | **20 MB** | Batas total semua dokumen 1 pelamar |
| **Ukuran Minimum** | **10 KB** | Mencegah file corrupt |
| **Jumlah Maks file** | 10 files per NIK | Mencegah spam |

### Konfigurasi Ukuran:

```javascript
// File size limits in bytes
const FILE_SIZE_LIMITS = {
  pasfoto: {
    maxBytes: 2 * 1024 * 1024,      // 2 MB
    minBytes: 10 * 1024,             // 10 KB
    maxResolution: { width: 2000, height: 2000 },
    minResolution: { width: 300, height: 400 }
  },
  dokumen: {
    maxBytes: 5 * 1024 * 1024,      // 5 MB per file
    minBytes: 10 * 1024,             // 10 KB
    maxTotalBytes: 20 * 1024 * 1024, // 20 MB total per NIK
    maxFilesPerNik: 10
  }
};

// Human-readable size labels
const SIZE_LABELS = {
  pasfoto: 'Maksimal 2MB, format JPG/PNG/WebP',
  dokumen: 'Maksimal 5MB per file, format PDF/JPG/PNG'
};
```

---

## E. STORAGE POLICY (ROW LEVEL SECURITY)

### Kebijakan Akses Storage:

#### 1. Policy: SELECT (Baca/Mengunduh)

```sql
-- Policy untuk membaca file (PUBLIC untuk pasfoto)
-- Jalankan di Supabase SQL Editor

CREATE POLICY "Pasfoto is publicly accessible"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'simbakes' 
  AND storage.foldername(name)[1] = 'pasfoto'
);

-- Policy untuk membaca dokumen (authenticated only)
CREATE POLICY "Dokumen accessible to authenticated users"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'simbakes' 
  AND storage.foldername(name)[1] = 'dokumen'
  AND auth.role() = 'authenticated'
);
```

#### 2. Policy: INSERT (Upload)

```sql
-- Policy untuk upload file (hanya authenticated users)
CREATE POLICY "Authenticated users can upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'simbases' 
  AND auth.role() = 'authenticated'
);
```

#### 3. Policy: DELETE (Hapus)

```sql
-- Policy untuk hapus file (admin atau owner)
CREATE POLICY "Admins and owners can delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'simbakes' 
  AND (
    auth.role() = 'authenticated' 
    -- atau role check: auth.jwt() ->> 'role' = 'admin'
  )
);
```

### Ringkasan Policy:

| Operasi | Siapa Bisa | Keterangan |
|---------|-----------|------------|
| **SELECT (Baca)** | Semua orang | Untuk folder `pasfoto/` |
| **SELECT (Baca)** | User login | Untuk folder `dokumen/` |
| **INSERT (Upload)** | User login | Upload file sendiri |
| **DELETE (Hapus)** | Admin / Owner | Hapus file |

---

## F. CARA FRONTEND MENGUPLOAD FILE

### Flow Proses Upload:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  1. Pilih   │───►│  2. Validasi│───►│  3. Upload  │───►│  4. Simpan  │
│     File    │    │     File    │    │  ke Storage │    │  Path ke DB │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Kode JavaScript Utilitas Upload:

```javascript
/**
 * SIMBAKES File Upload Utility
 * Untuk digunakan di frontend (HTML/JS/Vue/React/dll)
 */

import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * ============================================
 * CONFIGURATION
 * ============================================
 */
const STORAGE_CONFIG = {
  bucketName: 'simbakes',
  
  // Folder paths
  folders: {
    pasfoto: 'pasfoto',
    dokumen: 'dokumen'
  },
  
  // Allowed MIME types
  allowedMimeTypes: {
    pasfoto: ['image/jpeg', 'image/png', 'image/webp'],
    dokumen: ['application/pdf', 'image/jpeg', 'image/png']
  },
  
  // Allowed extensions
  allowedExtensions: {
    pasfoto: ['.jpg', '.jpeg', '.png', '.webp'],
    dokumen: ['.pdf', '.jpg', '.jpeg', '.png']
  },
  
  // Size limits (bytes)
  sizeLimits: {
    pasfoto: {
      max: 2 * 1024 * 1024,      // 2MB
      min: 10 * 1024             // 10KB
    },
    dokumen: {
      max: 5 * 1024 * 1024,      // 5MB
      min: 10 * 1024             // 10KB
    }
  }
};


/**
 * ============================================
 * VALIDATION FUNCTIONS
 * ============================================
 */

/**
 * Validasi tipe file (MIME type)
 */
function validateFileType(file, fieldType) {
  const allowedMimes = STORAGE_CONFIG.allowedMimeTypes[fieldType];
  const allowedExts = STORAGE_CONFIG.allowedExtensions[fieldType];
  
  // Check MIME type
  if (!allowedMimes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipe file tidak diizinkan. Yang diizinkan: ${allowedExts.join(', ')}`
    };
  }
  
  // Check extension
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExts.includes(ext)) {
    return {
      valid: false,
      error: `Ekstensi file tidak diizinkan. Yang diizinkan: ${allowedExts.join(', ')}`
    };
  }
  
  return { valid: true };
}

/**
 * Validasi ukuran file
 */
function validateFileSize(file, fieldType) {
  const limits = STORAGE_CONFIG.sizeLimits[fieldType];
  
  if (file.size < limits.min) {
    return {
      valid: false,
      error: `Ukuran file terlalu kecil (min: ${(limits.min / 1024).toFixed(0)}KB)`
    };
  }
  
  if (file.size > limits.max) {
    return {
      valid: false,
      error: `Ukuran file terlalu besar (maks: ${(limits.max / 1024 / 1024).toFixed(0)}MB)`
    };
  }
  
  return { valid: true };
}

/**
 * Validasi lengkap sebelum upload
 */
function validateFileForUpload(file, fieldType) {
  // Check 1: Tipe file
  const typeValidation = validateFileType(file, fieldType);
  if (!typeValidation.valid) return typeValidation;
  
  // Check 2: Ukuran file
  const sizeValidation = validateFileSize(file, fieldType);
  if (!sizeValidation.valid) return sizeValidation;
  
  return { valid: true };
}


/**
 * ============================================
 * UPLOAD FUNCTIONS
 * ============================================
 */

/**
 * Generate nama file yang unik dan terstruktur
 */
function generateFileName(nik, fileType, originalName, fieldType) {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop().toLowerCase();
  
  if (fieldType === 'pasfoto') {
    return `${STORAGE_CONFIG.folders.pasfoto}/${nik}/pasfoto_${nik}.${ext}`;
  } else {
    // Untuk dokumen, gunakan nama original yang sudah di-sanitize
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${STORAGE_CONFIG.folders.dokumen}/${nik}/${sanitizedName}`;
  }
}

/**
 * Upload PasFoto
 * 
 * @param {File} file - File object dari input[type="file"]
 * @param {string} nik - NIK pelamar
 * @returns {Object} { success, path, error, publicUrl }
 */
async function uploadPasfoto(file, nik) {
  try {
    // Step 1: Validate
    const validation = validateFileForUpload(file, 'pasfoto');
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Step 2: Generate file path
    const filePath = generateFileName(nik, 'pasfoto', file.name, 'pasfoto');
    
    // Step 3: Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',        // Cache 1 jam
        upsert: true                 // Overwrite jika sudah ada
      });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Step 4: Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .getPublicUrl(filePath);
    
    return {
      success: true,
      path: filePath,
      publicUrl: urlData.publicUrl
    };
    
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Upload Dokumen
 * 
 * @param {File} file - File object dari input[type="file"]
 * @param {string} nik - NIK pelamar
 * @returns {Object} { success, path, error, publicUrl }
 */
async function uploadDokumen(file, nik) {
  try {
    // Step 1: Validate
    const validation = validateFileForUpload(file, 'dokumen');
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Step 2: Generate file path
    const filePath = generateFileName(nik, 'dokumen', file.name, 'dokumen');
    
    // Step 3: Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Step 4: Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .getPublicUrl(filePath);
    
    return {
      success: true,
      path: filePath,
      publicUrl: urlData.publicUrl
    };
    
  } catch (err) {
    return { success: false, error: err.message };
  }
}


/**
 * ============================================
 * HELPER: HTML Input Example
 * ============================================
 */

/*
Contoh penggunaan di HTML:

<input type="file" id="inputPasfoto" accept=".jpg,.jpeg,.png,.webp">
<input type="file" id="inputDokumen" accept=".pdf,.jpg,.jpeg,.png">
<button onclick="handleUpload()">Upload</button>

<script>
async function handleUpload() {
  const nik = '3201234567890001'; // Ambil dari form
  
  // Upload PasFoto
  const pasfotoFile = document.getElementById('inputPasfoto').files[0];
  if (pasfotoFile) {
    const result = await uploadPasfoto(pasfotoFile, nik);
    if (result.success) {
      console.log('PasFoto uploaded:', result.path);
      console.log('Public URL:', result.publicUrl);
      // Simpan result.path ke kolom 'pasfoto' di data_pengusulan
    } else {
      alert('Error upload pasfoto: ' + result.error);
    }
  }
  
  // Upload Dokumen
  const dokumenFile = document.getElementById('inputDokumen').files[0];
  if (dokumenFile) {
    const result = await uploadDokumen(dokumenFile, nik);
    if (result.success) {
      console.log('Dokumen uploaded:', result.path);
      console.log('Public URL:', result.publicUrl);
      // Simpan result.path ke kolom 'dokumen' di data_pengusulan
    } else {
      alert('Error upload dokumen: ' + result.error);
    }
  }
}
</script>
*/


/**
 * ============================================
 * EXPORTS
 * ============================================
 */

// Export untuk ES modules
export {
  uploadPasfoto,
  uploadDokumen,
  validateFileForUpload,
  STORAGE_CONFIG
};

// Export untuk CommonJS (jika diperlukan)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    uploadPasfoto,
    uploadDokumen,
    validateFileForUpload,
    STORAGE_CONFIG
  };
}
```

---

## G. CARA MENDAPATKAN URL/PATH FILE

### Metode 1: Public URL (Untuk File Publik)

```javascript
/**
 * Mendapatkan Public URL file
 * Digunakan untuk file yang aksesnya publik (pasfoto)
 */
function getPublicUrl(path) {
  const { data } = supabase.storage
    .from('simbakes')
    .getPublicUrl(path);
  
  return data.publicUrl;
}

// Contoh penggunaan:
const pasfotoPath = 'pasfoto/3201234567890001/pasfoto_3201234567890001.jpg';
const publicUrl = getPublicUrl(pasfotoPath);
// Result: https://your-project.supabase.co/storage/v1/object/public/simbakes/pasfoto/3201234567890001/pasfoto_3201234567890001.jpg
```

### Metode 2: Signed URL (Untuk File Privat - Dokumen)

```javascript
/**
 * Mendapatkan Signed URL (temporary access)
 * Digunakan untuk file privat (dokumen) yang memerlukan autentikasi
 * 
 * @param {string} path - Path file di storage
 * @param {number} expires - Waktu expired dalam detik (default: 3600 = 1 jam)
 * @returns {Promise<string>} Signed URL
 */
async function getSignedUrl(path, expires = 3600) {
  const { data, error } = await supabase.storage
    .from('simbakes')
    .createSignedUrl(path, expires);
  
  if (error) throw error;
  return data.signedUrl;
}

// Contoh penggunaan:
const dokumenPath = 'dokumen/3201234567890001/ktp_3201234567890001.pdf';
const signedUrl = await getSignedUrl(dokumenPath, 1800); // Berlaku 30 menit
```

### Metode 3: Download Langsung

```javascript
/**
 * Download file langsung sebagai blob
 */
async function downloadFile(path) {
  const { data, error } = await supabase.storage
    .from('simbakes')
    .download(path);
  
  if (error) throw error;
  return data; // Blob
}

// Contoh: Download dan buka di tab baru
const blob = await downloadFile(dokumenPath);
const url = URL.createObjectURL(blob);
window.open(url, '_blank');
```

### Perbandingan Metode URL:

| Metode | Kegunaan | Expired? | Autentikasi |
|--------|----------|----------|-------------|
| **Public URL** | PasFoto (ditampilkan) | ❌ Tidak | Tidak perlu |
| **Signed URL** | Dokumen (sensitif) | ✅ Ya (1-24 jam) | Dibuat oleh user login |
| **Download** | Force download | ❌ Tidak | User login |

---

## H. CARA MENYIMPAN REFERENSI FILE KE data_pengusulan

### ⚠️ PENTING: ANALISIS KEIBUTUHAN PERUBAHAN DATABASE

#### Situasi Saat Ini:

Berdasarkan struktur Excel, field di tabel `data_pengusulan`:

| Field | Tipe Saat di SQL | Fungsi |
|-------|-------------------|--------|
| `pasfoto` | TEXT | Menyimpan referensi/link file pasfoto |
| `dokumen` | TEXT | Menyimpan referensi/link file dokumen |

#### Pertanyaan Kritis:

**Apakah struktur saat ini sudah cukup?**

| Opsi | Keterangan | Implementasi |
|------|-----------|--------------|
| **A. TIDAK PERLU UBAH** | Kolom `pasfoto` dan `dokumen` sudah TEXT, siap menyimpan path/URL | Simpan path langsung ke kolom existing |
| **B. PERLU TAMBAH** | Butuh tracking multiple file, metadata tambahan | Perlu diskusi lebih lanjut |

---

### IMPLEMENTASI OPSI A: TANPA PERUBAHAN DATABASE (REKOMENDASI)

Kolom `pasfoto` dan `dokumen` sudah bertipe **TEXT**, sehingga bisa langsuk menyimpan path file.

#### Cara Simpan:

```javascript
/**
 * Contoh lengkap: Upload + Simpan ke Database
 */
async function submitPengusulanWithFiles(formData, nik) {
  try {
    // 1. Upload PasFoto (jika ada)
    let pasfotoPath = null;
    if (formData.pasfotoFile) {
      const pasfotoResult = await uploadPasfoto(formData.pasfotoFile, nik);
      if (!pasfotoResult.success) {
        throw new Error('Gagal upload pasfoto: ' + pasfotoResult.error);
      }
      pasfotoPath = pasfotoResult.path;  // Simpan PATH ini ke DB
    }
    
    // 2. Upload Dokumen (jika ada)
    let dokumenPath = null;
    if (formData.dokumenFile) {
      const dokumenResult = await uploadDokumen(formData.dokumenFile, nik);
      if (!dokumenResult.success) {
        throw new Error('Gagal upload dokumen: ' + dokumenResult.error);
      }
      dokumenPath = dokumenResult.path;  // Simpan PATH ini ke DB
    }
    
    // 3. Simpan ke data_pengusulan (kolom pasfoto dan dokumen)
    const { data, error } = await supabase
      .from('data_pengusulan')
      .insert({
        nik: nik,
        nama_lengkap: formData.namaLengkap,
        tempat_lahir: formData.tempatLahir,
        tanggal_lahir: formData.tanggalLahir,
        alamat_ktp: formData.alamatKtp,
        alamat_domisili: formData.alamatDomisili,
        lama_domisili_tahun: formData.lamaDomisiliTahun,
        pekerjaan: formData.pekerjaan,
        posisi_jabatan: formData.posisiJabatan,
        unit_kerja: formData.unitKerja,
        penjelasan_narasi: formData.penjelasanNarasi,
        jurusan_tujuan: formData.jurusanTujuan,
        jenjang_pendidikan: formData.jenjangPendidikan,
        unit_tujuan_pemanfaatan: formData.unitTujuanPemanfaatan,
        rencana_tahun_studi: formData.rencanaTahunStudi,
        no_hp: formData.noHp,
        no_whatsapp: formData.noWhatsapp,
        email: formData.email,
        status: 'Draft',  // Status awal
        pasfoto: pasfotoPath,  // <-- SIMPAN PATH DI SINI
        dokumen: dokumenPath   // <-- SIMPAN PATH DI SINI
      });
    
    if (error) throw error;
    
    return { success: true, data };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

#### Format Data yang Tersimpan di Database:

**Tabel: data_pengusulan**

| nik | nama_lengkap | ... | pasfoto | dokumen |
|-----|--------------|-----|---------|---------|
| 3201234567890001 | Budi Santoso | ... | `pasfoto/3201234567890001/pasfoto_3201234567890001.jpg` | `dokumen/3201234567890001/ktp_3201234567890001.pdf` |
| 3201234567890002 | Ahmad Fauzi | ... | `pasfoto/3201234567890002/pasfoto_3201234567890002.png` | `dokumen/3201234567890002/ijazah_3201234567890002.pdf` |

#### Cara Membaca/Tampilkan File:

```javascript
/**
 * Mendapatkan URL lengkap untuk ditampilkan di frontend
 */
function getFileUrl(path) {
  if (!path) return null; // Tidak ada file
  
  // Jika path sudah full URL, return as-is
  if (path.startsWith('http')) return path;
  
  // Jika hanya path, generate public URL
  const { data } = supabase.storage
    .from('simbakes')
    .getPublicUrl(path);
  
  return data.publicUrl;
}

// Penggunaan di HTML:
// <img src="{getFileUrl(record.pasfoto)}" alt="PasFoto">
// <a href="{getSignedUrl(record.dokumen)}" target="_blank">Unduh Dokumen</a>
```

---

### IMPLEMENTASI OPSI B: JIKA PERLU PERUBAHAN DATABASE

> ⚠️ **INI MEMERLUKAN PERSETUJUAN ANDA**

Jika Anda membutuhkan fitur seperti:
- Multiple dokumen per pelamar
- Tracking metadata file (ukuran, tipe, upload date)
- Versioning file

Maka perlu perubahan struktur. **Silakan konfirmasi apakah Anda membutuhkan opsi ini.**

---

## 📋 CHECKLIST IMPLEMENTASI STORAGE

### Sebelum Mulai:

- [ ] Buat bucket `simbakes` di Supabase Dashboard → Storage
- [ ] Set bucket sebagai **Public** (untuk pasfoto) atau sesuaikan policy
- [ ] Jalankan SQL Storage Policy (Bagian E)
- [ ] Test upload dengan file sample

### Konfigurasi Environment:

```env
# .env file
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Testing:

```javascript
// Quick test di browser console
async function testUpload() {
  const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
  const result = await uploadPasfoto(testFile, 'TEST_NIK_001');
  console.log(result);
}
```

---

## ⚠️ CATATAN PENTING & PERTANYAAN

### Sudah Selesai (Tanpa Perubahan DB):

✅ Rancangan Bucket: `simbakes`  
✅ Struktur Folder: `{jenis}/{nik}/{filename}`  
✅ Aturan Tipe File: JPEG/PNG/WebP untuk pasfoto, PDF/JPEG/PNG untuk dokumen  
✅ Aturan Ukuran: Max 2MB (pasfoto), 5MB (dokumen)  
✅ Storage Policy: Public read (pasfoto), Auth read (dokumen)  
✅ Fungsi Upload JavaScript  
✅ Cara Get URL (Public & Signed)  

### Memerlukan Konfirmasi:

| No | Pertanyaan | Jawaban |
|----|-----------|---------|
| 1 | Apakah kolom `pasfoto` dan `dokumen` (tipe TEXT) sudah cukup untuk menyimpan path file? | [ ] Ya, cukup [ ] Perlu ubah |
| 2 | Apakah setiap pelamar hanya boleh **1 pasfoto** dan **1 dokumen** saja? | [ ] Ya [ ] Bisa banyak |
| 3 | Apakah dokumen harus **privat** (signed URL) atau **publik**? | [ ] Privat [ ] Publik |
| 4 | Apakah perlu fitur **delete file** otomatis saat data dihapus? | [ ] Ya [ ] Tidak |

---

*Dokumentasi ini dibuat berdasarkan analisis `template_simbakes versi supabase (2).xlsx`*  
*Tanggal: 2025-01-09*  
*Status: Menunggu konfirmasi pertanyaan di atas*
