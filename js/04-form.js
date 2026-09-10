// ===== FILE HANDLING =====

function handlePhotoUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast('❌ Ukuran foto maksimal 2MB!', 'error');
            input.value = '';
            return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('❌ Format file harus gambar (JPG/PNG)!', 'error');
            input.value = '';
            return;
        }
        
        // Show loading state on upload area
        const uploadArea = document.getElementById('photo-upload');
        uploadArea.style.opacity = '0.7';
        uploadArea.style.pointerEvents = 'none';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // Store base64 data
            uploadedPhoto = e.target.result;
            
            // Enhanced preview with better styling
            const preview = document.getElementById('photo-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            preview.style.objectFit = 'cover';
            preview.style.objectPosition = 'center';
            
            // Hide placeholder (with null check)
            const photoPlaceholder = document.getElementById('photo-placeholder');
            if (photoPlaceholder) photoPlaceholder.style.display = 'none';
            
            // Update upload area style
            document.getElementById('photo-upload').classList.add('has-image');
            uploadArea.style.opacity = '1';
            uploadArea.style.pointerEvents = 'auto';
            
            // Show success indicator
            showPhotoSuccessIndicator();
            
            console.log('✅ Foto berhasil diproses:', {
                size: file.size,
                type: file.type,
                base64Length: uploadedPhoto.length
            });
        };
        reader.onerror = function() {
            showToast('❌ Gagal membaca file foto!', 'error');
            uploadArea.style.opacity = '1';
            uploadArea.style.pointerEvents = 'auto';
        };
        reader.readAsDataURL(file);
    }
}

// Show success checkmark on photo upload
function showPhotoSuccessIndicator() {
    let indicator = document.getElementById('photo-success');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'photo-success';
        indicator.innerHTML = '✓';
        indicator.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            width: 28px;
            height: 28px;
            background: #059669;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 2px 8px rgba(5,150,105,0.4);
            z-index: 10;
        `;
        document.getElementById('photo-upload').appendChild(indicator);
    }
    indicator.style.display = 'flex';
}

function handleFileUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast('❌ Ukuran file maksimal 2MB!', 'error');
            input.value = '';
            return;
        }
        
        // Validate file type
        if (file.type !== 'application/pdf') {
            showToast('❌ Format file harus PDF!', 'error');
            input.value = '';
            return;
        }
        
        // Store file info
        uploadedFileInfo = {
            name: file.name,
            size: file.size,
            type: file.type
        };
        
        // Show loading state
        const uploadArea = document.getElementById('file-upload-area');
        uploadArea.classList.add('loading');
        
        // Read PDF as Base64 for Google Drive upload
        const reader = new FileReader();
        reader.onload = function(e) {
            // Store base64 data
            uploadedPDFBase64 = e.target.result;
            
            // Update UI
            document.getElementById('file-name-text').textContent = 
                `${file.name} (${formatFileSize(file.size)})`;
            document.getElementById('file-name-display').classList.remove('hidden');
            document.getElementById('file-upload-area').classList.add('has-file');
            document.getElementById('file-upload-area').classList.remove('loading');
            
            console.log('✅ Dokumen PDF berhasil diproses:', {
                name: file.name,
                size: file.size,
                base64Length: uploadedPDFBase64.length
            });
            
            showToast('📄 Dokumen siap dikirim', 'success');
        };
        reader.onerror = function() {
            showToast('❌ Gagal membaca file PDF!', 'error');
            document.getElementById('file-upload-area').classList.remove('loading');
            uploadedPDFBase64 = null;
            uploadedFileInfo = null;
        };
        reader.readAsDataURL(file); // This gives us base64
    }
}

function removeFile() {
    uploadedPDFBase64 = null;
    uploadedFileInfo = null;
    document.getElementById('file-dokumen').value = '';
    document.getElementById('file-name-display').classList.add('hidden');
    document.getElementById('file-upload-area').classList.remove('has-file');
}

// ============================================================
// GOOGLE DRIVE LINK HANDLING FUNCTIONS (NEW!)
// ============================================================

/**
 * Validate Google Drive link format and show preview container
 */
function validateDriveLink(input, previewContainerId) {
    const value = input.value.trim();
    const previewContainer = document.getElementById(previewContainerId);
    
    if (!value || value.length < 10) {
        // Hide preview if link is too short or empty
        if (previewContainer && !previewContainer.classList.contains('hidden')) {
            previewContainer.classList.add('hidden');
        }
        return false;
    }
    
    // Check if it looks like a valid URL (Google Drive or any URL)
    const isValidUrl = /^(https?:\/\/)?(www\.)?(drive\.google\.com|docs\.google\.com|[\w.-]+\.[a-z]{2,})/.test(value);
    
    if (isValidUrl) {
        input.style.borderColor = '#86efac';  // Green border for valid
        return true;
    } else {
        input.style.borderColor = '#fca5a5';  // Red border for invalid
        return false;
    }
}

/**
 * Preview Google Drive content when user leaves the input field
 * @param {HTMLInputElement} input - The input element with the Drive link
 * @param {string} type - 'image' or 'pdf'
 * @param {string} previewContainerId - ID of the preview container
 */
function previewDriveContent(input, type, previewContainerId) {
    const url = input.value.trim();
    const previewContainer = document.getElementById(previewContainerId);
    
    if (!url || url.length < 15) {
        if (previewContainer) previewContainer.classList.add('hidden');
        return;
    }
    
    // Convert Google Drive sharing link to direct preview link
    let previewUrl = convertDriveUrlToPreview(url, type);
    
    if (!previewUrl) {
        console.warn('[DRIVE] Could not generate preview URL for:', url.substring(0, 50));
        // Still show container but with fallback
        if (previewContainer) {
            previewContainer.classList.remove('hidden');
            updatePreviewContent(previewContainer, type, url);  // Use original URL as fallback
        }
        return;
    }
    
    // Show preview container
    if (previewContainer) {
        previewContainer.classList.remove('hidden');
        updatePreviewContent(previewContainer, type, previewUrl);
        
        console.log('[DRIVE] ✅ Preview loaded for', type, ':', previewUrl.substring(0, 60) + '...');
    }
}

/**
 * Update preview container content based on type
 */
function updatePreviewContent(container, type, url) {
    if (type === 'image') {
        const img = container.querySelector('img');
        if (img) {
            img.src = url;
            img.parentElement.classList.remove('loaded');  // Reset loading state
        }
    } else if (type === 'pdf') {
        const iframe = container.querySelector('iframe');
        if (iframe) {
            iframe.src = url;
            iframe.parentElement.classList.remove('loaded');
        }
    }
}

/**
 * Convert various Google Drive URL formats to previewable URLs
 */
function convertDriveUrlToPreview(url, type) {
    if (!url) return null;
    
    // Extract file ID from different Google Drive URL formats
    let fileId = null;
    
    // Format: https://drive.google.com/file/d/FILE_ID/view
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) fileId = fileMatch[1];
    
    // Format: https://drive.google.com/open?id=FILE_ID
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (!fileId && openMatch) fileId = openMatch[1];
    
    // If it's a Google Drive link with file ID
    if (fileId) {
        if (type === 'image') {
            // For images: use thumbnail API
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800-h600`;
        } else {
            // For PDFs: use Google Docs viewer
            return `https://drive.google.com/file/d/${fileId}/preview`;
        }
    }
    
    // For Google Docs/Sheets links (already viewable)
    if (url.includes('docs.google.com') || url.includes('sheets.google.com')) {
        // Convert to embeddable preview
        if (url.includes('/edit')) {
            return url.replace('/edit', '/preview');
        }
        return url;
    }
    
    // Return original URL for non-Drive links (might work or not)
    return url;
}

/**
 * Open full preview in new tab/window
 */
function openDrivePreview(url, type) {
    if (!url || url.length < 15) {
        showToast('⚠️ Link belum diisi', 'warning');
        return;
    }
    
    let previewUrl = convertDriveUrlToPreview(url, type) || url;
    
    // Open in new tab
    window.open(previewUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    
    console.log('[DRIVE] Opening preview:', previewUrl);
}

/**
 * Clear drive link and hide preview
 */
function clearDriveLink(inputId, previewContainerId) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewContainerId);
    
    if (input) {
        input.value = '';
        input.style.borderColor = '';  // Reset border color
    }
    
    if (previewContainer) {
        previewContainer.classList.add('hidden');
    }
    
    console.log('[DRIVE] Link cleared:', inputId);
}

/**
 * Download Template Surat Pernyataan
 * Downloads template dari Google Drive (format langsung bisa didownload)
 */
function downloadTemplateSuratPernyataan() {
    console.log('[TEMPLATE] Downloading Surat Pernyataan template...');
    
    // Check if admin provided a custom template link
    const customTemplateLink = document.getElementById('template-drive-link')?.value?.trim();
    
    if (customTemplateLink) {
        // Convert to direct download link if needed
        const downloadLink = convertToDirectDownloadLink(customTemplateLink);
        window.open(downloadLink, '_blank');
        showToast('📥 Membuka template...', 'success');
        return;
    }
    
    // ===== DEFAULT TEMPLATE (Google Drive - SIMBAKES) =====
    // Link Google Drive template Surat Pernyataan
    const defaultTemplateUrl = 'https://drive.google.com/uc?export=download&id=1VJOlZKGs_2N0fYZDCXReHosvthMSqmOx';
    
    console.log('[TEMPLATE] Opening default template from Google Drive...');
    window.open(defaultTemplateUrl, '_blank');
    showToast('📥 Mendownload Template Surat Pernyataan...', 'success');
}

/**
 * Convert Google Drive sharing URL to direct download URL
 * Supports multiple Google Drive URL formats
 */
function convertToDirectDownloadLink(url) {
    // Jika sudah format download langsung, return as-is
    if (url.includes('/uc?export=') || url.includes('open?id=')) {
        return url;
    }
    
    // Extract file ID dari berbagai format URL Google Drive
    let fileId = null;
    
    // Format 1: /d/FILE_ID/edit atau /d/FILE_ID/view
    const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match1) fileId = match1[1];
    
    // Format 2: id=FILE_ID
    if (!fileId) {
        const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match2) fileId = match2[1];
    }
    
    // Format 3: open?id=FILE_ID
    if (!fileId) {
        const match3 = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
        if (match3) fileId = match3[1];
    }
    
    // Jika file ID ditemukan, convert ke download link
    if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    
    // Jika tidak bisa parse, return original URL
    console.warn('[TEMPLATE] Could not extract file ID from URL, using original');
    return url;
}

/**
 * Generate Surat Pernyataan template content
 */
function generateSuratPernyataanTemplate() {
    const currentDate = new Date().toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    
    return `
SURAT PERNYATAAN

Yang bertanda tangan di bawah ini:

Nama Lengkap       : ...............................................
NIK                 : ...............................................
Tempat, Tgl Lahir   : ...............................................
Jenis Kelamin       : Laki-laki / Perempuan
Agama               : ...............................................
Pekerjaan           : ...............................................
Institusi           : ...............................................
Alamat             : ...............................................
No. HP/WA          : ...............................................
Email              : ...............................................

Dengan ini menyatakan dengan sesungguhnya bahwa:

1. Saya bersedia mengikuti Program Beasiswa Tematik Bidang Kesehatan yang diselenggarakan oleh Dinas Kesehatan Kabupaten Kutai Kartanegara.

2. Data yang saya sampaikan dalam formulir pendaftaran adalah data yang BENAR dan dapat dipertanggungjawabkan.

3. Saya bersedia memenuhi semua persyaratan dan ketentuan yang berlaku dalam program beasiswa ini.

4. Jika dikemudian hari ditemukan data yang tidak benar/palsu, saya siap menerima konsekuensi pembatalan penerimaan beasiswa.

5. Saya bersedia menyelesaikan pendidikan sesuai jenjang yang saya ajukan dan kembali bertugas di Kabupaten Kutai Kartanegara sesuai perjanjian.


Demikian surat pernyataan ini saya buat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.



Hormat saya,


(.....................................................)

Materai Rp. 10.000,-


${currentDate}
    `.trim();
}

// Make functions globally available
window.validateDriveLink = validateDriveLink;
window.previewDriveContent = previewDriveContent;
window.openDrivePreview = openDrivePreview;
window.clearDriveLink = clearDriveLink;
window.handlePreviewError = handlePreviewError;
window.downloadTemplateSuratPernyataan = downloadTemplateSuratPernyataan;
window.convertToDirectDownloadLink = convertToDirectDownloadLink;

console.log('[DRIVE LINK] ✅ Google Drive link handler functions initialized');

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== FORM VALIDATION & SUBMISSION =====
// ============================================================
// [Task9e] VALIDASI TERPUSAT — spesifikasi perbaikan Kirim Pengajuan
//  - validateSubmission() memeriksa SELURUH field wajib + dokumen
//  - Link dokumen divalidasi KETAT (harus URL Drive/berkas valid,
//    bukan sekadar teks/nama file yang tampil)
//  - Foto diverifikasi benar-benar dapat dimuat (analog "validasi
//    status upload storage")
//  - Hasil validasi: daftar masalah terstruktur utk panel error
// ============================================================

// Daftar field teks wajib: [id, label, grup]
var REQUIRED_TEXT_FIELDS = [
    ['nik', 'NIK', 'Data Pribadi'],
    ['nama-lengkap', 'Nama Lengkap', 'Data Pribadi'],
    ['tempat-lahir', 'Tempat Lahir', 'Data Pribadi'],
    ['tanggal-lahir', 'Tanggal Lahir', 'Data Pribadi'],
    ['alamat-ktp', 'Alamat KTP', 'Data Pribadi'],
    ['alamat-domisili', 'Alamat Domisili', 'Data Pribadi'],
    ['lama-domisili', 'Lama Domisili', 'Data Pribadi'],
    ['no-hp', 'Nomor HP', 'Data Pribadi'],
    ['no-wa', 'Nomor WhatsApp', 'Data Pribadi'],
    ['email', 'Email', 'Data Pribadi'],
    ['pekerjaan', 'Pekerjaan', 'Data Pekerjaan'],
    ['posisi', 'Posisi', 'Data Pekerjaan'],
    ['unit-kerja', 'Unit Kerja', 'Data Pekerjaan'],
    ['penjelasan', 'Penjelasan', 'Data Pekerjaan'],
    ['jurusan-tujuan', 'Jurusan Tujuan', 'Data Pengusulan Beasiswa'],
    ['jenjang-pendidikan', 'Jenjang Pendidikan', 'Data Pengusulan Beasiswa'],
    ['unit-tujuan', 'Unit Tujuan', 'Data Pengusulan Beasiswa'],
    ['rencana-tahun', 'Rencana Tahun Studi', 'Data Pengusulan Beasiswa']
];

// Elemen yang di-highlight merah (dibersihkan oleh clearFormErrors)
var __invalidFieldEls = [];

// [Task9e] Flag anti double-submit — klik ganda / klik beruntun diabaikan
var __submitInProgress = false;

function getFieldEl(id) {
    return document.getElementById(id);
}

function isDriveHost(hostname) {
    var h = String(hostname || '').replace(/^www\./, '').toLowerCase();
    return h === 'drive.google.com' || h === 'docs.google.com' || h === 'drive.usercontent.google.com';
}

/**
 * [Task9e] Validasi link dokumen secara KETAT.
 * @returns null jika valid, atau pesan error (string)
 */
function checkDocumentLink(value, label, kind) {
    if (!value) {
        return label + ' wajib diisi — paste link Google Drive pada kolom ' + label;
    }
    var s = String(value).trim();
    if (s.length < 20) {
        return label + ' terlalu pendek — salin link lengkap dari Google Drive (diawali https://)';
    }
    if (/^(www\.)?(drive\.google\.com|docs\.google\.com)\//i.test(s)) {
        s = 'https://' + s;
    }
    var u;
    try {
        u = new URL(s);
    } catch (e) {
        return label + ' bukan URL yang valid (harus diawali https://)';
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return label + ' harus berupa link http/https';
    }
    if (isDriveHost(u.hostname)) {
        var p = u.pathname;
        var hasId = /\/file\/d\/([A-Za-z0-9_-]{10,})/.test(p) ||
                    /\/document\/d\/([A-Za-z0-9_-]{10,})/.test(p) ||
                    /\/presentation\/d\/([A-Za-z0-9_-]{10,})/.test(p) ||
                    /\/spreadsheets\/d\/([A-Za-z0-9_-]{10,})/.test(p) ||
                    /\/folders\/([A-Za-z0-9_-]{10,})/.test(p) ||
                    /\/d\/([A-Za-z0-9_-]{10,})/.test(p) ||
                    (u.searchParams && u.searchParams.get('id'));
        if (!hasId) {
            return label + ' bukan link berbagi Google Drive yang valid — di Drive klik "Bagikan" → "Salin link" lalu paste kembali';
        }
        return null; // Link Drive dengan ID file/folder valid
    }
    // Bukan host Drive → wajib tautan file langsung dengan ekstensi yang benar
    var extOk = (kind === 'image') ? /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(u.pathname)
                                   : /\.pdf(\?|$)/i.test(u.pathname);
    if (!extOk) {
        var harapan = (kind === 'image') ? 'gambar (JPG/PNG/WEBP)' : 'PDF (.pdf)';
        return label + ' harus berupa link Google Drive atau tautan langsung file ' + harapan;
    }
    return null;
}

/**
 * [Task9e] Verifikasi foto benar-benar dapat dimuat browser.
 * Link Drive publik → thumbnail/direct URL berhasil dimuat.
 * @returns Promise<boolean> true = dapat dimuat ATAU tidak dapat dipastikan
 *          (jaringan lambat) — tidak boleh memblokir karena ketidakpastian
 */
function verifyPhotoAccessible(linkValue) {
    return new Promise(function (resolve) {
        try {
            var candidates = [];
            var direct = (typeof getDirectImageUrl === 'function') ? getDirectImageUrl(linkValue) : linkValue;
            if (direct) candidates.push(direct);
            var m = String(linkValue).match(/\/file\/d\/([A-Za-z0-9_-]{10,})/) ||
                    String(linkValue).match(/[?&]id=([A-Za-z0-9_-]{10,})/);
            if (m) candidates.push('https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w800');
            if (!candidates.length) { resolve(true); return; }

            var i = 0, settled = false, timeoutId = null;
            function tryNext() {
                if (settled) return;
                if (i >= candidates.length) {
                    if (timeoutId) clearTimeout(timeoutId);
                    resolve(false); // Semua kandidat gagal dimuat → link tidak dapat diakses
                    return;
                }
                var img = new Image();
                img.onload = function () {
                    if (settled) return;
                    settled = true;
                    if (timeoutId) clearTimeout(timeoutId);
                    resolve(true);
                };
                img.onerror = function () { i++; tryNext(); };
                img.src = candidates[i++];
            }
            tryNext();
            // Batas waktu 10 dtk: koneksi lambat → jangan blokir pengguna
            timeoutId = setTimeout(function () {
                if (!settled) { settled = true; resolve(true); }
            }, 10000);
        } catch (e) {
            console.warn('[FORM] verifyPhotoAccessible gagal dijalankan:', e);
            resolve(true);
        }
    });
}

/**
 * [Task9e] VALIDASI TERPUSAT — dipanggil sebelum konfirmasi & sebelum insert.
 * @returns {valid:boolean, problems:[{id,label,message,group}]}
 */
function validateSubmission() {
    var problems = [];

    function pushProblem(id, label, message, group) {
        problems.push({ id: id, label: label, message: message, group: group || 'Lainnya' });
    }

    // --- 1. Nomor register & tanggal: pulihkan otomatis bila kosong ---
    var regEl = getFieldEl('reg-nomor');
    if (regEl && !String(regEl.value || '').trim()) {
        regEl.value = generateRegNumber();
        console.info('[FORM] Nomor register kosong — dibuat ulang otomatis:', regEl.value);
    }
    var tglEl = getFieldEl('reg-tanggal');
    if (tglEl && !String(tglEl.value || '').trim() && typeof initializeForm === 'function') {
        initializeForm();
    }

    // --- 2. Field teks wajib + format khusus ---
    REQUIRED_TEXT_FIELDS.forEach(function (f) {
        var id = f[0], label = f[1], group = f[2];
        var el = getFieldEl(id);
        if (!el) {
            pushProblem(id, label, label + ' (elemen tidak ditemukan — muat ulang halaman)', group);
            return;
        }
        var value = String(el.value || '').trim();
        if (!value) {
            pushProblem(id, label, label + ' belum diisi', group);
            return;
        }
        if (id === 'nik' && !/^\d{16}$/.test(value)) {
            pushProblem(id, label, 'NIK harus tepat 16 digit angka (saat ini ' + value.length + ' digit)', group);
        } else if (id === 'email' && !isValidEmail(value)) {
            pushProblem(id, label, 'Format email tidak valid (contoh: nama@email.com)', group);
        } else if ((id === 'no-hp' || id === 'no-wa') && value.replace(/\D/g, '').length < 9) {
            pushProblem(id, label, label + ' minimal 9 digit angka', group);
        }
    });

    // --- 3. Dokumen wajib: link harus benar-benar valid (bukan sekadar teks) ---
    [['foto-drive-link', 'Link Foto Pasfoto', 'image'],
     ['dokumen-drive-link', 'Link Dokumen Kelengkapan (PDF)', 'pdf'],
     ['surat-pernyataan-link', 'Link Surat Pernyataan (PDF)', 'pdf']
    ].forEach(function (d) {
        var el = getFieldEl(d[0]);
        var value = el ? String(el.value || '').trim() : '';
        var msg = checkDocumentLink(value, d[1], d[2]);
        if (msg) pushProblem(d[0], d[1], msg, 'Dokumen Persyaratan');
    });

    return { valid: problems.length === 0, problems: problems };
}

/**
 * Wrapper kompatibilitas utk pemanggil lama — mengembalikan boolean.
 */
function validateForm() {
    var result = validateSubmission();
    if (!result.valid) {
        showFormErrors(result.problems);
        return false;
    }
    clearFormErrors();
    return true;
}

// ============================================================
// [Task9e] NOMOR PENGAJUAN UNIK (anti duplikat)
// ============================================================

function generateRegNumber() {
    var now = new Date();
    var dateStr = now.getFullYear().toString() +
                  String(now.getMonth() + 1).padStart(2, '0') +
                  String(now.getDate()).padStart(2, '0');
    var randomNum = String(Math.floor(Math.random() * 900000) + 100000);
    return 'REG-SIMBAKES-' + dateStr + randomNum;
}

/**
 * [Task9e] Pastikan no_register belum terpakai di database.
 * Kolom no_register di Supabase TIDAK punya constraint unique (terverifikasi),
 * sehingga pengecekan ini wajib dilakukan sebelum insert.
 */
async function ensureUniqueRegNumber(candidate, attempts) {
    attempts = attempts || 0;
    if (!candidate) candidate = generateRegNumber();
    if (!supabaseClient) return candidate;
    try {
        var q = await supabaseClient.from('submissions')
            .select('id')
            .eq('no_register', candidate)
            .limit(1);
        if (q.error) {
            console.warn('[FORM] Cek unik no_register gagal (dilanjutkan tanpa cek):', q.error.message);
            return candidate;
        }
        if (q.data && q.data.length > 0) {
            console.warn('[FORM] Nomor sudah terpakai, membuat nomor baru:', candidate);
            if (attempts >= 6) return candidate + '-' + String(Date.now()).slice(-4);
            return ensureUniqueRegNumber(generateRegNumber(), attempts + 1);
        }
        return candidate;
    } catch (e) {
        console.warn('[FORM] Cek unik no_register error (dilanjutkan):', e);
        return candidate;
    }
}

// ============================================================
// [Task9e] Panel error dalam halaman — pengganti alert() yang
// sering DIBLOKIR/DITEKAN di webview in-app (WhatsApp/IG/FB)
// dan sebagian browser mobile, sehingga tombol Kirim terlihat
// "mati" tanpa pesan. Panel ini tampil di SEMUA browser/platform.
//
// [Task9e] PENINGKATAN (spesifikasi poin 1):
//  - Menerima array string ATAU array {id,label,message,group}
//  - Field bermasalah di-HIGHLIGHT merah
//  - Setiap item BISA DIKLIK → scroll otomatis ke field-nya
//  - Scroll otomatis ke isian bermasalah PERTAMA
// ============================================================
function showFormErrors(problems, title) {
    var items = (problems || []).map(function (p) {
        return (typeof p === 'string') ? { id: null, label: p, message: '', group: '' } : p;
    });
    if (!items.length) return;

    var host = document.getElementById('form-ajukan');
    if (!host) {
        var joined = items.map(function (p) { return p.message ? (p.label + ': ' + p.message) : p.label; }).join('; ');
        showToast('❌ ' + (joined || 'Form belum lengkap'), 'error', 6000);
        return;
    }
    var panel = document.getElementById('form-error-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'form-error-panel';
        panel.setAttribute('role', 'alert');
        panel.style.cssText = 'margin:0 0 1.25rem;padding:1rem 1.25rem;border-radius:12px;' +
            'background:#fef2f2;border:2px solid #ef4444;color:#7f1d1d;';
        host.insertBefore(panel, host.firstChild);
    }
    var judul = title || ('Mohon lengkapi ' + items.length + ' isian berikut:');
    var esc = function (s) { return String(s == null ? '' : s).replace(/</g, '&lt;'); };
    var listHtml = items.map(function (p, idx) {
        var teks = p.message ? (esc(p.label) + ' — ' + esc(p.message)) : esc(p.label);
        var grp = p.group ? '<span style="color:#b91c1c;opacity:0.75;">[' + esc(p.group) + ']</span> ' : '';
        if (p.id) {
            return '<li style="margin:4px 0;white-space:pre-line;cursor:pointer;text-decoration:underline;" ' +
                'onclick="focusProblemField(\'' + esc(p.id) + '\')" title="Klik untuk menuju isian ini">' +
                grp + teks + '</li>';
        }
        return '<li style="margin:4px 0;white-space:pre-line;">' + grp + teks + '</li>';
    }).join('');
    panel.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">' +
        '<strong style="font-size:1rem;">⚠️ ' + esc(judul) + '</strong>' +
        '<button type="button" onclick="clearFormErrors()" title="Tutup" ' +
        'style="border:none;background:#fecaca;color:#7f1d1d;border-radius:8px;padding:4px 10px;cursor:pointer;font-weight:bold;">×</button>' +
        '</div>' +
        '<ul style="margin:0.5rem 0 0 1.25rem;padding:0;">' + listHtml + '</ul>' +
        '<p style="margin:0.6rem 0 0;font-size:0.85rem;color:#991b1b;">Klik pesan di atas untuk langsung menuju isian yang bermasalah, perbaiki, lalu klik <b>Kirim Pengajuan</b> sekali lagi.</p>';

    // [Task9e] Highlight field yang bermasalah
    clearInvalidHighlights();
    items.forEach(function (p) {
        if (!p.id) return;
        var el = getFieldEl(p.id);
        if (el) {
            el.style.outline = '2px solid #ef4444';
            el.style.outlineOffset = '1px';
            el.setAttribute('aria-invalid', 'true');
            __invalidFieldEls.push(el);
        }
    });

    // [Task9e] Scroll otomatis ke isian bermasalah PERTAMA (fallback: panel)
    var firstEl = null;
    for (var i = 0; i < items.length; i++) {
        if (items[i].id) { firstEl = getFieldEl(items[i].id); if (firstEl) break; }
    }
    try {
        if (firstEl) {
            firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof firstEl.focus === 'function') firstEl.focus({ preventScroll: true });
        } else {
            panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } catch (e) {}
    showToast('⚠️ ' + items.length + ' isian perlu diperbaiki', 'error', 5000);
}

/**
 * [Task9e] Menuju field bermasalah (dipanggil dari item panel yang diklik).
 */
function focusProblemField(id) {
    var el = getFieldEl(id);
    if (!el) return;
    try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof el.focus === 'function') el.focus({ preventScroll: true });
    } catch (e) {}
}

function clearInvalidHighlights() {
    __invalidFieldEls.forEach(function (el) {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.removeAttribute('aria-invalid');
    });
    __invalidFieldEls = [];
}

function clearFormErrors() {
    var panel = document.getElementById('form-error-panel');
    if (panel) panel.remove();
    clearInvalidHighlights();
}

function showSubmitError(title, detail) {
    showFormErrors([detail], title);
}
window.showFormErrors = showFormErrors;
window.clearFormErrors = clearFormErrors;
window.showSubmitError = showSubmitError;
window.focusProblemField = focusProblemField;

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showConfirmation() {
    // [Task9d/e] Wrapper pengaman: error tak terduga APAPUN harus menghasilkan
    // umpan balik yang terlihat di layar — tombol Kirim tidak boleh mati
    // diam-diam (keluhan user: klik tidak bereaksi sama sekali).
    try {
        var r = showConfirmationUnsafe();
        if (r && typeof r.catch === 'function') {
            r.catch(function (e) {
                console.error('[FORM] showConfirmation (async) error:', e);
                try {
                    showFormErrors([
                        'Terjadi kesalahan teknis saat menyiapkan konfirmasi: ' + (e && e.message ? e.message : e) +
                        '. Muat ulang halaman (Ctrl+Shift+R) lalu coba lagi.'
                    ], 'Terjadi kendala:');
                } catch (e2) {
                    try { showToast('❌ ' + (e && e.message ? e.message : 'Kesalahan tak terduga'), 'error', 8000); } catch (e3) {}
                }
            });
        }
    } catch (e) {
        console.error('[FORM] showConfirmation error:', e);
        try {
            showFormErrors([
                'Terjadi kesalahan teknis saat menyiapkan konfirmasi: ' + (e && e.message ? e.message : e) +
                '. Muat ulang halaman (Ctrl+Shift+R) lalu coba lagi.'
            ], 'Terjadi kendala:');
        } catch (e2) {
            try { showToast('❌ ' + (e && e.message ? e.message : 'Kesalahan tak terduga'), 'error', 8000); } catch (e3) {}
        }
    }
}

async function showConfirmationUnsafe() {
    clearFormErrors();

    // [Task9e] Validasi terpusat: field wajib + dokumen ketat
    if (!validateForm()) return;

    // [Task9e] Pulihkan state tombol submit (bisa jadi sisa state gagal/sukses sebelumnya)
    __submitInProgress = false;
    var finalBtn = document.getElementById('btn-submit-final');
    if (finalBtn) setSubmitBtnState(finalBtn, 'normal');

    // [Task9e] Pastikan nomor register BENAR-BENAR UNIK di database
    // sebelum ditampilkan di layar konfirmasi (anti duplikat)
    var regEl = document.getElementById('reg-nomor');
    if (regEl && supabaseClient) {
        try {
            var unique = await ensureUniqueRegNumber(String(regEl.value || '').trim());
            if (unique && unique !== String(regEl.value || '').trim()) {
                console.info('[FORM] Nomor register diganti agar unik:', regEl.value, '→', unique);
                regEl.value = unique;
            }
        } catch (e) {
            console.warn('[FORM] Cek unik nomor register gagal (dilanjutkan):', e);
        }
    }

    // [Task9e] Verifikasi foto benar-benar dapat diakses (bukan sekadar link terisi)
    var fotoLink = document.getElementById('foto-drive-link')?.value?.trim();
    if (fotoLink) {
        var fotoOk = await verifyPhotoAccessible(fotoLink);
        if (!fotoOk) {
            showFormErrors([{
                id: 'foto-drive-link',
                label: 'Link Foto Pasfoto',
                message: 'foto TIDAK dapat dimuat — pastikan file dibagikan di Drive dengan akses "Anyone with the link / Siapa saja yang memiliki link", lalu coba lagi',
                group: 'Dokumen Persyaratan'
            }], 'Dokumen belum dapat diakses:');
            return;
        }
    }

    // [Task9] Pembaca aman — elemen yang hilang tidak lagi melempar
    // TypeError (penyebab klik Kirim terasa mati di browser tertentu)
    const gv = (id) => {
        const e = document.getElementById(id);
        return e && typeof e.value === 'string' ? e.value : '';
    };
    
    // [Task9e] Link dokumen (fotoLink sudah dibaca di verifikasi atas)
    const dokumenLink = document.getElementById('dokumen-drive-link')?.value?.trim();
    const suratLink = document.getElementById('surat-pernyataan-link')?.value?.trim();
    
    // Build confirmation list
    const confirmList = document.getElementById('confirm-list');
    if (!confirmList) {
        showToast('❌ Elemen konfirmasi tidak ditemukan — muat ulang halaman', 'error', 6000);
        return;
    }
    confirmList.innerHTML = `
        <div class="confirm-item"><span class="confirm-label">No. Register</span><span class="confirm-value">${gv('reg-nomor')}</span></div>
        <div class="confirm-item"><span class="confirm-label">Waktu Pengajuan</span><span class="confirm-value">${gv('reg-tanggal')}</span></div>
        <div class="confirm-item"><span class="confirm-label">NIK</span><span class="confirm-value">${gv('nik')}</span></div>
        <div class="confirm-item"><span class="confirm-label">Nama Lengkap</span><span class="confirm-value">${gv('nama-lengkap')}</span></div>
        <div class="confirm-item"><span class="confirm-label">Tempat, Tgl Lahir</span><span class="confirm-value">${gv('tempat-lahir')}, ${formatDate(gv('tanggal-lahir'))}</span></div>
        <div class="confirm-item"><span class="confirm-label">Pekerjaan</span><span class="confirm-value">${gv('pekerjaan')}</span></div>
        <div class="confirm-item"><span class="confirm-label">Unit Kerja</span><span class="confirm-value">${gv('unit-kerja')}</span></div>
        <div class="confirm-item"><span class="confirm-label">Jurusan Tujuan</span><span class="confirm-value">${gv('jurusan-tujuan')}</span></div>
        <div class="confirm-item"><span class="confirm-label">Jenjang</span><span class="confirm-value">${gv('jenjang-pendidikan')}</span></div>
        <div class="confirm-item"><span class="confirm-label">Durasi Studi</span><span class="confirm-value">${gv('rencana-tahun')}</span></div>
        <div class="confirm-item"><span class="confirm-label">No. HP/WA</span><span class="confirm-value">${gv('no-hp')} / ${gv('no-wa')}</span></div>
        <div class="confirm-item"><span class="confirm-label">Email</span><span class="confirm-value">${gv('email')}</span></div>
        
        <!-- Google Drive Links (NEW!) -->
        <div class="confirm-item" style="background:#f0fdf4;border-radius:8px;padding:10px;margin:8px 0;">
            <span class="confirm-label" style="color:#059669;">📷 Foto Pasfoto (Drive)</span>
            <span class="confirm-value" style="font-size:0.78rem;max-width:70%;">${fotoLink ? '✓ Link tersedia' : '❌ Belum diisi'}</span>
        </div>
        <div class="confirm-item" style="background:#eff6ff;border-radius:8px;padding:10px;margin:8px 0;">
            <span class="confirm-label" style="color:#2563eb;">📄 Dokumen PDF (Drive)</span>
            <span class="confirm-value" style="font-size:0.78rem;max-width:70%;">${dokumenLink ? '✓ Link tersedia' : '❌ Belum diisi'}</span>
        </div>
        <div class="confirm-item" style="background:#fefce8;border-radius:8px;padding:10px;margin:8px 0;">
            <span class="confirm-label" style="color:#d97706;">📝 Surat Pernyataan (Drive)</span>
            <span class="confirm-value" style="font-size:0.78rem;max-width:70%;">${suratLink ? '✓ Link tersedia' : '❌ Belum diisi'}</span>
        </div>
    `;
    
    document.getElementById('confirm-modal').classList.add('active');
}

async function submitForm() {
    const submitBtn = document.getElementById('btn-submit-final');
    if (!submitBtn) {
        // [Task9] Jangan biarkan klik mati total bila elemen tombol tidak ada
        showToast('❌ Tombol kirim tidak ditemukan — muat ulang halaman (Ctrl+R)', 'error', 6000);
        return;
    }

    // [Task9e] CEGAH DOUBLE SUBMIT (spesifikasi poin 3):
    // klik ganda / klik saat proses berjalan diabaikan total
    if (__submitInProgress) {
        console.warn('[FORM] Pengiriman sedang berjalan — klik diabaikan (double-submit guard)');
        return;
    }

    clearFormErrors();

    // DEFENSE-IN-DEPTH [Task9e]: validasi ulang SELURUH form sebelum kirim
    // (mencegah data tidak lengkap tersimpan bila modal konfirmasi dilewati)
    const preValidation = validateSubmission();
    if (!preValidation.valid) {
        closeModal('confirm-modal');
        showFormErrors(preValidation.problems);
        setSubmitBtnState(submitBtn, 'normal');
        return;
    }

    // [Task9e] Proses dimulai: tombol loading + terkunci
    __submitInProgress = true;
    setSubmitBtnState(submitBtn, 'loading');
    console.log('[FORM] 🚀 Memulai proses pengiriman pengajuan...');

    // Collect form data with Google Drive links (NEW! - replacing base64 files)
    const formData = {
        noRegister: document.getElementById('reg-nomor').value,
        tanggalPengajuan: document.getElementById('reg-tanggal').value,
        nik: document.getElementById('nik').value,
        namaLengkap: document.getElementById('nama-lengkap').value,
        tempatLahir: document.getElementById('tempat-lahir').value,
        tanggalLahir: document.getElementById('tanggal-lahir').value,
        alamatKTP: document.getElementById('alamat-ktp').value,
        alamatDomisili: document.getElementById('alamat-domisili').value,
        lamaDomisili: document.getElementById('lama-domisili').value,
        pekerjaan: document.getElementById('pekerjaan').value,
        posisi: document.getElementById('posisi').value,
        unitKerja: document.getElementById('unit-kerja').value,
        penjelasan: document.getElementById('penjelasan').value,
        jurusanTujuan: document.getElementById('jurusan-tujuan').value,
        jenjangPendidikan: document.getElementById('jenjang-pendidikan').value,
        unitTujuan: document.getElementById('unit-tujuan').value,
        rencanaTahun: document.getElementById('rencana-tahun').value,
        noHP: document.getElementById('no-hp').value,
        noWA: document.getElementById('no-wa').value,
        email: document.getElementById('email').value,

        // GOOGLE DRIVE LINKS (disimpan ke kolom foto_peserta & dokumen_kelengkapan)
        fotoDriveLink: document.getElementById('foto-drive-link')?.value?.trim(),           // Link foto pasfoto
        dokumenDriveLink: document.getElementById('dokumen-drive-link')?.value?.trim(),     // Link dokumen/folder
        suratPernyataanLink: document.getElementById('surat-pernyataan-link')?.value?.trim(),  // Link surat pernyataan

        status: 'Proses Verifikasi',
        timestamp: new Date().toISOString(),
        submissionMethod: 'google_drive_links'  // Flag to indicate new method
    };

    console.log('📦 Data form siap dikirim:', {
        hasFotoLink: !!formData.fotoDriveLink && formData.fotoDriveLink.length > 15,
        hasDokumenLink: !!formData.dokumenDriveLink && formData.dokumenDriveLink.length > 15,
        hasSuratPernyataan: !!formData.suratPernyataanLink && formData.suratPernyataanLink.length > 15,
        submissionMethod: 'Google Drive Links'
    });

    try {
        // [Task9e] Wajib Supabase — TANPA fallback localStorage palsu
        // (spesifikasi poin 14: jangan tampilkan sukses palsu)
        if (!supabaseClient) {
            throw new Error('Supabase tidak terhubung — periksa koneksi internet Anda lalu coba kirim kembali.');
        }

        // [Task9e] Pastikan nomor register unik tepat sebelum insert (poin 9)
        formData.noRegister = await ensureUniqueRegNumber(String(formData.noRegister || '').trim());
        const regInput = document.getElementById('reg-nomor');
        if (regInput) regInput.value = formData.noRegister;

        console.log('🚀 Mengirim ke Supabase...');
        const result = await submitToSupabase(formData);

        // [Task9e] Jangan anggap berhasil hanya karena fungsi selesai dijalankan —
        // hasil insert WAJIB diverifikasi eksplisit (spesifikasi poin 6)
        if (!result || !result.length) {
            throw new Error('Database tidak mengembalikan record — pengajuan TIDAK tersimpan.');
        }
        const savedRecord = result[0];
        console.log('✅ Berhasil disimpan ke Supabase!', savedRecord);

        // Simpan record utk penerbitan Bukti Pendaftaran (module 15)
        window.__buktiLastRecord = savedRecord;

        // [Task9e] SUKSES (poin 3, 8, 16): tombol state ✓ + modal sukses
        // berisi Nomor Registrasi, tanggal pengajuan, dan status "Diajukan"
        setSubmitBtnState(submitBtn, 'success');
        closeModal('confirm-modal');
        document.getElementById('success-reg-number').textContent = savedRecord.no_register || formData.noRegister;
        const successTgl = document.getElementById('success-tanggal');
        if (successTgl) successTgl.textContent = formData.tanggalPengajuan || '-';
        const successStatus = document.getElementById('success-status');
        if (successStatus) successStatus.textContent = 'Diajukan';
        document.getElementById('success-modal').classList.add('active');
        showToast('✅ Pengajuan berhasil dikirim!', 'success');
        // [Task9e] __submitInProgress TETAP true — submit kedua setelah sukses
        // tidak mungkin terjadi (dipulihkan oleh showConfirmation()/resetForm()
        // bila pengguna benar-benar membuat pengajuan baru)

    } catch (error) {
        // [Task9e] GAGAL (poin 11): error teknis dicatat di console,
        // pengguna hanya melihat pesan ramah + tombol aktif kembali
        console.error('❌ Error submitting form:', error);
        console.error('❌ Error details:', {
            message: error && error.message,
            code: error && error.code,
            hint: error && error.hint,
            details: error && error.details,
            supabaseConnected: !!supabaseClient,
            waktu: new Date().toISOString()
        });

        setSubmitBtnState(submitBtn, 'error'); // "Coba Kirim Kembali" (aktif)
        closeModal('confirm-modal');
        showSubmitError('Pengajuan belum dapat dikirim', friendlySubmitErrorMessage(error));
        __submitInProgress = false; // boleh mencoba lagi
    }
}

/**
 * [Task9e] State tombol submit (spesifikasi poin 3 & 16):
 * normal | loading | success | error
 */
function setSubmitBtnState(btn, state) {
    if (!btn) return;
    var labels = {
        normal: 'Ya, Kirim Sekarang',
        loading: '<div class="spinner"></div> Mengirim Pengajuan...',
        success: '✓ Pengajuan Berhasil Dikirim',
        error: 'Coba Kirim Kembali'
    };
    btn.innerHTML = labels[state] || labels.normal;
    btn.disabled = (state === 'loading' || state === 'success');
}

/**
 * [Task9e] Pesan gagal yang ramah untuk pengguna (poin 11).
 * Detail teknis tetap dicatat di console oleh pemanggil.
 */
function friendlySubmitErrorMessage(error) {
    var msg = (error && error.message) ? String(error.message) : '';
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return 'Anda sedang tidak terhubung ke internet. Periksa koneksi lalu tekan "Coba Kirim Kembali".';
    }
    if (error && error.code === '23505') {
        return 'Nomor pengajuan bentrok dengan data yang sudah ada. Tekan "Coba Kirim Kembali" — nomor baru akan dibuat otomatis.';
    }
    if (/Failed to fetch|NetworkError|network|load failed/i.test(msg)) {
        return 'Koneksi ke server database terputus. Periksa koneksi internet Anda lalu tekan "Coba Kirim Kembali".';
    }
    if (error && (error.code === '42501' || /row-level security|permission denied/i.test(msg))) {
        return 'Server menolak penyimpanan data (izin database). Silakan hubungi admin melalui kontak resmi.';
    }
    if (error && error.code === '23502') {
        return 'Ada data wajib yang belum terisi. Periksa kembali formulir lalu coba lagi.';
    }
    return 'Pengajuan belum dapat dikirim. Terjadi kendala saat menyimpan data. Silakan coba kembali.';
}

/**
 * [Task9e] Handler submit form asli (spesifikasi poin 2).
 * form#form-ajukan memakai onsubmit="handleFormSubmit(event)" dan tombol
 * "Kirim Pengajuan" bertipe type="submit" — klik ATAU tombol Enter masuk
 * lewat jalur submit form yang sama & konsisten.
 */
function handleFormSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    showConfirmation();
    return false;
}

window.validateSubmission = validateSubmission;
window.handleFormSubmit = handleFormSubmit;
window.ensureUniqueRegNumber = ensureUniqueRegNumber;
window.generateRegNumber = generateRegNumber;

// Helper to get client IP (browser tidak bisa akses IP langsung)
// Mengembalikan '-' karena browser memblokir akses IP untuk privacy
async function getClientIP() {
    // Browser tidak bisa mengakses IP user secara langsung
    // API eksternal akan diblokir oleh CORS
    return '-';
}

function saveToLocal(data) {
    try {
        // =====================================================
        // OPTIMIZED: Don't store base64 files in localStorage!
        // Only store metadata and text data to avoid QuotaExceededError
        // =====================================================
        const optimizedData = {
            noRegister: data.noRegister,
            tanggalPengajuan: data.tanggalPengajuan,
            nik: data.nik,
            namaLengkap: data.namaLengkap,
            tempatLahir: data.tempatLahir,
            tanggalLahir: data.tanggalLahir,
            alamatKTP: data.alamatKTP,
            alamatDomisili: data.alamatDomisili,
            lamaDomisili: data.lamaDomisili,
            pekerjaan: data.pekerjaan,
            posisi: data.posisi,
            unitKerja: data.unitKerja,
            penjelasan: data.penjelasan ? data.penjelasan.substring(0, 500) + '...' : '',  // Truncate long text
            jurusanTujuan: data.jurusanTujuan,
            jenjangPendidikan: data.jenjangPendidikan,
            unitTujuan: data.unitTujuan,
            rencanaTahun: data.rencanaTahun,
            noHP: data.noHP,
            noWA: data.noWA,
            email: data.email,
            
            // File metadata only (NOT the actual base64 data!)
            hasFoto: !!data.foto && data.foto.length > 100,
            hasPDF: !!data.dokumenPDF && data.dokumenPDF.length > 100,
            namaFile: data.namaFile || null,
            fotoSize: data.foto ? Math.round(data.foto.length / 1024) + 'KB' : null,
            pdfSize: data.dokumenPDF ? Math.round(data.dokumenPDF.length / 1024) + 'KB' : null,
            
            status: data.status || 'Proses Verifikasi',
            timestamp: data.timestamp || new Date().toISOString(),
            
            // Flag that files need to be re-uploaded when resubmitting
            needsFileResubmit: true
        };
        
        // Add to array (limit to last 20 entries to prevent quota exceeded)
        submittedApplications.push(optimizedData);
        
        if (submittedApplications.length > 20) {
            console.log('[SIMBAKES] 🧹 Cleanup: Menghapus', submittedApplications.length - 20, 'data lama...');
            submittedApplications = submittedApplications.slice(-20);  // Keep only last 20
        }
        
        // Try to save with error handling for QuotaExceededError
        const jsonString = JSON.stringify(submittedApplications);
        
        // Check size before saving (warn if >2MB)
        if (jsonString.length > 2 * 1024 * 1024) {
            console.warn('[SIMBAKES] ⚠️ Data mendekati batas localStorage:', 
                       Math.round(jsonString.length / 1024), 'KB');
        }
        
        localStorage.setItem('simbakes_applications', jsonString);
        
        console.log('[SIMBAKES] ✅ Data tersimpan di localStorage (optimized, tanpa file base64)');
        console.log('[SIMBAKES] 📊 Ukuran data:', Math.round(jsonString.length / 1024), 'KB');
        console.log('[SIMBAKES] 📝 Total aplikasi tersimpan:', submittedApplications.length);
        
    } catch (error) {
        console.error('[SIMBAKES] ❌ Error menyimpan ke localStorage:', error);
        
        if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
            // Emergency cleanup - remove oldest entries until we can save
            console.error('[SIMBAKES] 💥 LocalStorage penuh! Melakukan emergency cleanup...');
            
            try {
                // Keep only last 5 entries (aggressive cleanup)
                const recentData = submittedApplications.slice(-5);
                const minimizedData = recentData.map(app => ({
                    noRegister: app.noRegister,
                    namaLengkap: app.namaLengkap,
                    email: app.email,
                    status: app.status,
                    timestamp: app.timestamp
                    // Minimal data only
                }));
                
                localStorage.setItem('simbakes_applications', JSON.stringify(minimizedData));
                submittedApplications = minimizedData;
                
                console.log('[SIMBAKES] ✅ Emergency cleanup berhasil. Data lama dihapus.');
                
                // Try again with current data (minimal version)
                const minimalCurrent = {
                    noRegister: data.noRegister,
                    namaLengkap: data.namaLengkap,
                    email: data.email,
                    status: data.status || 'Proses Verifikasi',
                    timestamp: new Date().toISOString(),
                    note: 'Files not stored due to storage limits'
                };
                
                submittedApplications.push(minimalCurrent);
                localStorage.setItem('simbakes_applications', JSON.stringify(submittedApplications));
                
                showToast('⚠️ Penyimpanan terbatas. Data dasar tersimpan, namun file perlu diupload ulang nanti.', 'warning');
                
            } catch (cleanupError) {
                console.error('[SIMBAKES] ❌ Gagal emergency cleanup:', cleanupError);
                throw new Error('LocalStorage penuh dan tidak bisa dibersihkan. Hapus data browser atau gunakan mode Incognito.');
            }
        } else {
            throw error;  // Re-throw other errors
        }
    }
    
    // Also add to pengusulData for admin view (without base64)
    pengusulData.unshift({
        id: Date.now().toString(),
        nama: data.namaLengkap,
        institusi: data.unitKerja,
        programStudi: data.jurusanTujuan,
        email: data.email,
        noTelepon: data.noHP,
        judulProposal: data.penjelasan ? data.penjelasan.substring(0, 50) + '...' : '-',
        status: 'Proses Verifikasi',
        tanggalPengajuan: new Date().toISOString().split('T')[0],
        noRegister: data.noRegister
    });
}

function resetForm() {
    // [Task9e] Pulihkan state pengiriman & tombol submit saat form di-reset
    __submitInProgress = false;
    var finalBtn = document.getElementById('btn-submit-final');
    if (finalBtn) setSubmitBtnState(finalBtn, 'normal');

    document.getElementById('form-ajukan').reset();
    
    // Reset file variables
    uploadedPhoto = null;
    uploadedPDFBase64 = null;
    uploadedFileInfo = null;
    
    // Reset photo upload area (with null checks)
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) {
        photoPreview.style.display = 'none';
        photoPreview.src = '';
    }
    const photoPlaceholderReset = document.getElementById('photo-placeholder');
    if (photoPlaceholderReset) photoPlaceholderReset.style.display = 'flex';
    const photoUpload = document.getElementById('photo-upload');
    if (photoUpload) photoUpload.classList.remove('has-image');
    
    // Remove photo success indicator if exists
    const photoSuccess = document.getElementById('photo-success');
    if (photoSuccess) {
        photoSuccess.remove();
    }
    
    // Reset PDF upload area
    document.getElementById('file-name-display').classList.add('hidden');
    document.getElementById('file-upload-area').classList.remove('has-file', 'loading');
    
    // Re-initialize form
    initializeForm();
}

// ===== SEARCH STATUS =====

// ============================================================
// LOCAL STORAGE UTILITY FUNCTIONS (for QuotaExceededError fix)
// ============================================================

/**
 * Check localStorage usage and return stats
 * Call from console: checkStorageUsage()
 */
function checkStorageUsage() {
    let totalSize = 0;
    const items = {};
    
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            const value = localStorage.getItem(key);
            const size = value ? new Blob([value]).size : 0;
            totalSize += size;
            items[key] = {
                size: Math.round(size / 1024) + 'KB',
                preview: value ? value.substring(0, 50) + '...' : null
            };
        }
    }
    
    const usagePercent = Math.round((totalSize / (5 * 1024 * 1024)) * 100);  // Assume 5MB limit
    
    console.log('📊 === LOCAL STORAGE USAGE ===');
    console.log(`Total: ${Math.round(totalSize / 1024)} KB / ~5000 KB (${usagePercent}%)`);
    console.log('Items:', items);
    
    if (usagePercent > 80) {
        console.warn('⚠️ WARNING: Storage nearly full! Consider cleaning up.');
    }
    
    return { totalSize, usagePercent, items };
}

/**
 * Clear all SIMBAKES data from localStorage
 * Call from console: clearSimbakesStorage()
 */
function clearSimbakesStorage() {
    const keysToRemove = [];
    
    for (let key in localStorage) {
        if (key.startsWith('simbakes_') || key.includes('applications') || key.includes('pengusul')) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed: ${key}`);
    });
    
    // Reset in-memory arrays
    if (typeof submittedApplications !== 'undefined') {
        submittedApplications = [];
    }
    if (typeof pengusulData !== 'undefined') {
        pengusulData = [];
    }
    
    console.log(`✅ Cleared ${keysToRemove.length} SIMBAKES storage items`);
    showToast(`🗑️ ${keysToRemove.length} item data berhasil dihapus`, 'success');
    
    return keysToRemove.length;
}

/**
 * Clear only old application data (keep last 5)
 * Call from console: cleanupOldApplications()
 */
function cleanupOldApplications() {
    try {
        const stored = localStorage.getItem('simbakes_applications');
        if (!stored) {
            console.log('No applications to clean');
            return 0;
        }
        
        const apps = JSON.parse(stored);
        const originalCount = apps.length;
        
        // Keep only last 5, remove base64 data
        const cleaned = apps.slice(-5).map(app => {
            delete app.foto;
            delete app.dokumenPDF;
            return app;
        });
        
        localStorage.setItem('simbakes_applications', JSON.stringify(cleaned));
        
        // Update in-memory array
        if (typeof submittedApplications !== 'undefined') {
            submittedApplications = cleaned;
        }
        
        console.log(`✅ Cleaned up: ${originalCount} → ${cleaned.length} applications`);
        console.log(`   Removed ${originalCount - cleanedCount} old entries`);
        console.log(`   Removed base64 file data from remaining entries`);
        
        return originalCount - cleaned.length;
        
    } catch (e) {
        console.error('Error during cleanup:', e);
        return -1;
    }
}

// Make functions available globally for console access
window.checkStorageUsage = checkStorageUsage;
window.clearSimbakesStorage = clearSimbakesStorage;
window.cleanupOldApplications = cleanupOldApplications;

console.log('[SIMBAKES] 💡 Storage utility functions available:');
console.log('  - checkStorageUsage()  : Check localStorage usage');
console.log('  - clearSimbakesStorage() : Clear all SIMBAKES data');
console.log('  - cleanupOldApplications() : Keep only recent data');

/**
 * Cek Status Pengajuan - Search from Supabase submissions table
 * Updated: Now queries directly from Supabase instead of local data only
 */
async function searchStatus() {
    const regNumber = document.getElementById('search-register')?.value?.trim();
    const nik = document.getElementById('search-nik')?.value?.trim();
    
    // Validation
    if (!regNumber && !nik) {
        showToast('❌ Masukkan Nomor Register atau NIK!', 'error');
        return;
    }
    
    console.log('[SIMBAKES] 🔍 Mencari status pengajuan...', { regNumber, nik });
    
    // Show loading state
    const resultContent = document.getElementById('search-result-content');
    if (resultContent) {
        resultContent.innerHTML = `
            <div style="text-align:center;padding:2rem;">
                <div class="spinner" style="margin:0 auto 1rem;"></div>
                <p style="color:#64748b;">Mencari data dari server...</p>
            </div>
        `;
    }
    
    document.getElementById('search-result-modal')?.classList.add('active');
    
    try {
        // Check Supabase client availability
        if (!supabaseClient) {
            throw new Error('Supabase client tidak tersedia. Silakan refresh halaman atau hubungi admin.');
        }
        
        // Query dari Supabase tabel submissions
        let query = supabaseClient
            .from('submissions')
            .select('*')
            .limit(1);
        
        if (nik) {
            query = query.eq('nik', nik);
        } else if (regNumber) {
            query = query.eq('no_register', regNumber);
        }
        
        const { data: submissionData, error } = await query;
        
        if (error) throw error;
        
        console.log('[SIMBAKES] ✅ Hasil pencarian pengajuan:', submissionData);
        
        if (submissionData && submissionData.length > 0) {
            const found = submissionData[0];
            displayStatusResult(found);
        } else {
            displayStatusNotFound(regNumber || nik, nik ? 'NIK' : 'Nomor Register');
        }
        
    } catch (error) {
        console.error('[SIMBAKES] ❌ Error mencari status pengajuan:', error);
        
        if (resultContent) {
            resultContent.innerHTML = `
                <div style="text-align:center;padding:2rem;background:#fef2f2;border-radius:12px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" width="48" height="48" style="margin:0 auto 1rem;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <p style="color:#dc2626;font-weight:600;margin-bottom:0.5rem;">Gagal Mengambil Data!</p>
                    <p style="font-size:0.875rem;color:#ef4444;margin-bottom:1rem;">${error.message}</p>
                    <div style="background:white;padding:1rem;border-radius:8px;text-align:left;font-size:0.8rem;">
                        <p style="color:#64748b;margin:0 0 0.5rem 0;"><strong>Solusi:</strong></p>
                        <ol style="color:#64748b;margin:0;padding-left:1.25rem;">
                            <li>Periksa koneksi internet</li>
                            <li>Refresh halaman (F5)</li>
                            <li>Coba lagi beberapa saat</li>
                            <li>Hubungi admin jika masalah berlanjut</li>
                        </ol>
                    </div>
                </div>
            `;
        }
        
        showToast('❌ Gagal mengambil data: ' + error.message, 'error');
    }
}

/**
 * Display status result for Cek Status Pengajuan
 * Data source: Supabase table 'submissions'
 * 23 Fields sesuai kolom tabel submissions:
 * nik, nama_lengkap, tempat_lahir, tanggal_lahir, alamat_ktp,
 * alamat_domisili, lama_domisili, pekerjaan, posisi, unit_kerja,
 * penjelasan, jurusan_tujuan, jenjang_pendidikan, unit_tujuan,
 * rencana_tahun, no_hp, no_wa, email, foto, dokumen_pdf,
 * nama_file, status, catatan_admin
 */
function displayStatusResult(found) {
    const resultContent = document.getElementById('search-result-content');
    
    if (!resultContent) return;
    
    // Format tanggal helper
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };
    
    // =====================================================
    // EXTRACT DATA FROM SUPABASE (snake_case columns)
    // Table: submissions - 23 Fields
    // =====================================================
    const data = {
        // Identitas Utama
        nik: getField(found, 'nik', 'nik'),
        nama_lengkap: getField(found, 'nama_lengkap', 'namaLengkap'),
        
        // Tempat & Tanggal Lahir
        tempat_lahir: getField(found, 'tempat_lahir', 'tempatLahir'),
        tanggal_lahir: getField(found, 'tanggal_lahir', 'tanggalLahir'),
        
        // Alamat
        alamat_ktp: getField(found, 'alamat_ktp', 'alamatKTP'),
        alamat_domisili: getField(found, 'alamat_domisili', 'alamatDomisili'),
        lama_domisili: getField(found, 'lama_domisili', 'lamaDomisili'),
        
        // Pekerjaan
        pekerjaan: getField(found, 'pekerjaan', 'pekerjaan'),
        posisi: getField(found, 'posisi', 'posisi'),
        unit_kerja: getField(found, 'unit_kerja', 'unitKerja'),
        penjelasan: getField(found, 'penjelasan', 'penjelasan'),
        
        // Pendidikan Tujuan
        jurusan_tujuan: getField(found, 'jurusan_tujuan', 'jurusanTujuan'),
        jenjang_pendidikan: getField(found, 'jenjang_pendidikan', 'jenjangPendidikan'),
        unit_tujuan: getField(found, 'unit_tujuan', 'unitTujuan'),
        rencana_tahun: getField(found, 'rencana_tahun', 'rencanaTahun'),
        
        // Kontak
        no_hp: getField(found, 'no_hp', 'noHP'),
        no_wa: getField(found, 'no_wa', 'noWA'),
        email: getField(found, 'email', 'email'),
        
        // Dokumen/Files - kolom aktual: foto_peserta & dokumen_kelengkapan
        foto: getField(found, 'foto_peserta', 'foto', '-'),
        dokumen_pdf: getField(found, 'dokumen_kelengkapan', 'dokumen_pdf', '-'),
        rekomendasi: getField(found, 'rekomendasi_dinkes', 'rekomendasi', '-'),
        
        // Status & Catatan
        status: getField(found, 'status', 'status', 'Proses Verifikasi'),
        catatan_admin: getField(found, 'catatan_admin', 'catatanAdmin', '')
    };
    
    // Determine status badge based on status value
    const statusLower = String(data.status).toLowerCase();
    let statusBadge = '';
    
    if (statusLower.includes('disetujui') || statusLower.includes('approve') || statusLower.includes('diterima')) {
        statusBadge = '<span style="padding:0.35rem 0.75rem;background:#dcfce7;color:#166534;border-radius:20px;font-size:0.75rem;font-weight:600;">✅ Disetujui</span>';
    } else if (statusLower.includes('ditolak') || statusLower.includes('tolak')) {
        statusBadge = '<span style="padding:0.35rem 0.75rem;background:#fee2e2;color:#991b1b;border-radius:20px;font-size:0.75rem;font-weight:600;">❌ Ditolak</span>';
    } else if (statusLower.includes('perbaikan') || statusLower.includes('revisi') || statusLower.includes('revision')) {
        statusBadge = '<span style="padding:0.35rem 0.75rem;background:#fef3c7;color:#92400e;border-radius:20px;font-size:0.75rem;font-weight:600;">⚠️ Perbaiki</span>';
    } else if (statusLower.includes('batal') || statusLower.includes('cancel') || statusLower.includes('dicabut')) {
        statusBadge = '<span style="padding:0.35rem 0.75rem;background:#f8fafc;color:#64748b;border-radius:20px;font-size:0.75rem;font-weight:600;">🚫 Dibatalkan</span>';
    } else {
        statusBadge = '<span style="padding:0.35rem 0.75rem;background:#dbeafe;color:#1e40af;border-radius:20px;font-size:0.75rem;font-weight:600;">⏳ Proses Verifikasi</span>';
    }
    
    // Build the result card - Headers match Supabase column names (snake_case)
    resultContent.innerHTML = `
        <div style="padding:1.5rem;">
            <!-- Header: NIK, Nama & Status -->
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;padding:1.25rem;margin-bottom:1rem;color:white;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
                    <div>
                        <h4 style="font-size:1.25rem;font-weight:700;margin:0 0 0.25rem 0;">${data.nama_lengkap}</h4>
                        <p style="font-family:monospace;font-size:0.85rem;margin:0;opacity:0.9;">nik: ${data.nik}</p>
                    </div>
                    ${statusBadge}
                </div>
            </div>
            
            <!-- Main Data Grid - 23 Fields from tabel submissions -->
            <div style="background:#f8fafc;border-radius:12px;padding:1.25rem;font-size:0.875rem;">
                
                <!-- SECTION 1: IDENTITAS DIRI -->
                <div style="font-size:0.7rem;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.65rem;padding-bottom:0.35rem;border-bottom:2px dashed #c7d2fe;">Identitas Diri</div>
                
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.65rem;margin-bottom:1rem;">
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">tempat_lahir</span>
                        <strong style="color:#334155;">${data.tempat_lahir || '-'}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">tanggal_lahir</span>
                        <strong style="color:#334155;">${formatDate(data.tanggal_lahir)}</strong>
                    </div>
                </div>
                
                <!-- SECTION 2: ALAMAT -->
                <div style="font-size:0.7rem;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.65rem;padding-bottom:0.35rem;border-bottom:2px dashed #a7f3d0;">Alamat</div>
                
                <div style="background:white;padding:0.65rem;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:0.5rem;">
                    <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">alamat_ktp</span>
                    <strong style="color:#334155;line-height:1.4;">${data.alamat_ktp || '-'}</strong>
                </div>
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.65rem;margin-bottom:1rem;">
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">alamat_domisili</span>
                        <strong style="color:#334155;line-height:1.3;">${data.alamat_domisili || '-'}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">lama_domisili</span>
                        <strong style="color:#334155;">${data.lama_domisili || '-'}</strong>
                    </div>
                </div>
                
                <!-- SECTION 3: PEKERJAAN -->
                <div style="font-size:0.7rem;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.65rem;padding-bottom:0.35rem;border-bottom:2px dashed #fecaca;">Pekerjaan</div>
                
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.65rem;margin-bottom:1rem;">
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">pekerjaan</span>
                        <strong style="color:#334155;">${data.pekerjaan || '-'}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">posisi</span>
                        <strong style="color:#334155;">${data.posisi || '-'}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">unit_kerja</span>
                        <strong style="color:#334155;">${data.unit_kerja || '-'}</strong>
                    </div>
                </div>
                
                ${data.penjelasan && data.penjelasan !== '-' ? `
                <div style="background:#fefce8;padding:0.65rem;border-radius:8px;border:1px solid #fde047;margin-bottom:1rem;">
                    <span style="font-size:0.65rem;color:#a16207;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;font-weight:600;">penjelasan</span>
                    <p style="font-size:0.85rem;color:#713f12;margin:0;line-height:1.5;">${data.penjelasan}</p>
                </div>
                ` : ''}
                
                <!-- SECTION 4: PENDIDIKAN TUJUAN -->
                <div style="font-size:0.7rem;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.65rem;padding-bottom:0.35rem;border-bottom:2px dashed #ddd6fe;">Pendidikan Tujuan</div>
                
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.65rem;margin-bottom:1rem;">
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">jurusan_tujuan</span>
                        <strong style="color:#334155;">${data.jurusan_tujuan || '-'}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">jenjang_pendidikan</span>
                        <strong style="color:#334155;">${data.jenjang_pendidikan || '-'}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">unit_tujuan</span>
                        <strong style="color:#334155;">${data.unit_tujuan || '-'}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">rencana_tahun</span>
                        <strong style="color:#334155;">${data.rencana_tahun || '-'}</strong>
                    </div>
                </div>
                
                <!-- SECTION 5: KONTAK -->
                <div style="font-size:0.7rem;font-weight:700;color:#0891b2;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.65rem;padding-bottom:0.35rem;border-bottom:2px dashed #a5f3fc;">Kontak</div>
                
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.65rem;margin-bottom:1rem;">
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">no_hp</span>
                        <strong style="font-family:monospace;color:#334155;">${data.no_hp || '-'}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">no_wa</span>
                        <strong style="font-family:monospace;color:#334155;">${data.no_wa || '-'}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">email</span>
                        <strong style="color:#334155;word-break:break-all;">${data.email || '-'}</strong>
                    </div>
                </div>
                
                <!-- SECTION 6: DOKUMEN/FILES -->
                <div style="font-size:0.7rem;font-weight:700;color:#ea580c;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.65rem;padding-bottom:0.35rem;border-bottom:2px dashed #fed7aa;">Dokumen & File</div>

                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.65rem;margin-bottom:1rem;">
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">foto_peserta</span>
                        <strong style="color:#334155;font-size:0.8rem;word-break:break-all;">${renderDriveLinks(data.foto, '📷 Buka Foto')}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">dokumen_kelengkapan</span>
                        <strong style="color:#334155;font-size:0.8rem;word-break:break-all;">${renderDriveLinks(data.dokumen_pdf, '📄 Buka Dokumen')}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">rekomendasi_dinkes</span>
                        <strong style="color:#334155;font-size:0.8rem;word-break:break-all;">${renderDriveLinks(data.rekomendasi, '📜 Buka Rekomendasi')}</strong>
                    </div>
                </div>
                
                <!-- SECTION 7: STATUS & CATATAN -->
                <div style="font-size:0.7rem;font-weight:700;color:#be185d;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.65rem;padding-bottom:0.35rem;border-bottom:2px dashed #fbcfe8;">Status & Catatan Admin</div>
                
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.65rem;">
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">status</span>
                        <strong style="color:#334155;">${data.status}</strong>
                    </div>
                    <div style="background:${data.catatan_admin && data.catatan_admin !== '' && data.catatan_admin !== '-' ? '#fdf2f8' : 'white'};padding:0.6rem;border-radius:8px;border:1px solid ${data.catatan_admin && data.catatan_admin !== '' && data.catatan_admin !== '-' ? '#fbcfe8' : '#e2e8f0'};grid-column:span 2;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;font-weight:600;">catatan_admin</span>
                        <p style="font-size:0.85rem;color:#9d174d;margin:0;line-height:1.5;">${data.catatan_admin && data.catatan_admin !== '' && data.catatan_admin !== '-' ? data.catatan_admin : '<span style="color:#94a3b8;">Tidak ada catatan</span>'}</p>
                    </div>
                </div>
                
            </div>
        </div>
    `;
    
    // Render tombol aksi status (Bukti Pendaftaran, Lihat Dokumen, Perbaikan, dst.)
    // FIX: setActionButtons sebelumnya tidak pernah dipanggil -> tombol aksi
    // tidak pernah muncul di hasil Cek Status.
    if (typeof setActionButtons === 'function') {
        setActionButtons(data.status);
    }
    
    console.log('[SIMBAKES] ✅ Displayed submission data (23 fields):', data);
}

/**
 * Display not found message for Cek Status Pengajuan
 */
function displayStatusNotFound(searchValue, searchType) {
    const resultContent = document.getElementById('search-result-content');
    
    if (!resultContent) return;
    
    resultContent.innerHTML = `
        <div style="text-align:center;padding:2rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" width="48" height="48" style="margin:0 auto 1rem;">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p style="color:#64748b;font-weight:600;font-size:1rem;margin-bottom:0.5rem;">Data Tidak Ditemukan</p>
            <p style="font-size:0.875rem;color:#94a3b8;margin-bottom:1rem;">${searchType} "<strong>${searchValue}</strong>" tidak ditemukan dalam database</p>
            <div style="background:#f8fafc;padding:1rem;border-radius:8px;text-align:left;font-size:0.8rem;max-width:300px;margin:0 auto;">
                <p style="color:#64748b;margin:0 0 0.5rem 0;font-weight:600;">Kemungkinan penyebab:</p>
                <ul style="color:#64748b;margin:0;padding-left:1.25rem;">
                    <li>Data belum diajukan</li>
                    <li>${searchType} salah diketik</li>
                    <li>Data masih dalam proses verifikasi</li>
                </ul>
            </div>
        </div>
    `;
}

// ===== RENDER FUNCTIONS =====

/**
 * Helper function to get field value from Supabase data
 * Handles both snake_case and camelCase column names for compatibility
 * @param {Object} data - The data object from Supabase
 * @param {string} snakeCaseKey - Column name in snake_case format
 * @param {string} camelCaseKey - Column name in camelCase format (optional)
 * @param {*} defaultValue - Default value if not found
 */
/**
 * Render nilai kolom link menjadi tombol/tautan yang aktif (bisa dibuka).
 * Mendukung satu nilai berisi beberapa URL (dipisah spasi/baris baru).
 * Semua teks non-URL ditampilkan apa adanya (aman dari XSS).
 * @param {*} value - nilai kolom (mis. foto_peserta / dokumen_kelengkapan)
 * @param {string} label - label tombol (mis. "📄 Buka Dokumen")
 */
function renderDriveLinks(value, label) {
    if (!value || value === '-' || String(value).trim().length < 10) {
        return '<span style="color:#94a3b8;">—</span>';
    }
    const urls = String(value).split(/\s+/).filter(function (v) { return /^https?:\/\//.test(v); });
    if (urls.length === 0) {
        return escapeHtmlValue(String(value));
    }
    return urls.map(function (u, i) {
        const suffix = urls.length > 1 ? ' ' + (i + 1) : '';
        return '<a href="' + escapeHtmlValue(u) + '" target="_blank" rel="noopener" ' +
            'style="display:inline-flex;align-items:center;gap:0.3rem;background:#eff6ff;color:#1d4ed8;' +
            'padding:0.35rem 0.7rem;border-radius:8px;font-size:0.75rem;font-weight:600;' +
            'text-decoration:none;border:1px solid #bfdbfe;margin:0.15rem 0.25rem 0.15rem 0;">' +
            escapeHtmlValue(label) + suffix + ' ↗</a>';
    }).join('');
}

/** Escape karakter HTML untuk atribut/teks (helper lokal). */
function escapeHtmlValue(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getField(data, snakeCaseKey, camelCaseKey, defaultValue = '-') {
    // Try snake_case first (standard Supabase convention)
    if (data && data[snakeCaseKey] !== undefined && data[snakeCaseKey] !== null) {
        return data[snakeCaseKey];
    }
    
    // Try camelCase (for backward compatibility)
    if (camelCaseKey && data && data[camelCaseKey] !== undefined && data[camelCaseKey] !== null) {
        return data[camelCaseKey];
    }
    
    // Return default value
    return defaultValue;
}



