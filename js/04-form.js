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
function validateForm() {
    const requiredFields = [
        { id: 'nik', name: 'NIK' },
        { id: 'nama-lengkap', name: 'Nama Lengkap' },
        { id: 'tempat-lahir', name: 'Tempat Lahir' },
        { id: 'tanggal-lahir', name: 'Tanggal Lahir' },
        { id: 'alamat-ktp', name: 'Alamat KTP' },
        { id: 'alamat-domisili', name: 'Alamat Domisili' },
        { id: 'lama-domisili', name: 'Lama Domisili' },
        { id: 'pekerjaan', name: 'Pekerjaan' },
        { id: 'posisi', name: 'Posisi' },
        { id: 'unit-kerja', name: 'Unit Kerja' },
        { id: 'penjelasan', name: 'Penjelasan' },
        { id: 'jurusan-tujuan', name: 'Jurusan Tujuan' },
        { id: 'jenjang-pendidikan', name: 'Jenjang Pendidikan' },
        { id: 'unit-tujuan', name: 'Unit Tujuan' },
        { id: 'rencana-tahun', name: 'Rencana Tahun Studi' },
        { id: 'no-hp', name: 'Nomor HP' },
        { id: 'no-wa', name: 'Nomor WhatsApp' },
        { id: 'email', name: 'Email' }
    ];
    
    let errors = [];
    
    requiredFields.forEach(field => {
        const value = document.getElementById(field.id).value.trim();
        if (!value) {
            errors.push(field.name);
        }
    });
    
    // Check Google Drive links (NEW! - replacing file upload checks)
    const fotoDriveLink = document.getElementById('foto-drive-link')?.value?.trim();
    const dokumenDriveLink = document.getElementById('dokumen-drive-link')?.value?.trim();
    const suratPernyataanLink = document.getElementById('surat-pernyataan-link')?.value?.trim();
    
    if (!fotoDriveLink || fotoDriveLink.length < 15) {
        errors.push('Link Foto Pasfoto (Google Drive)');
    }
    
    if (!dokumenDriveLink || dokumenDriveLink.length < 15) {
        errors.push('Link Dokumen PDF (Google Drive)');
    }
    
    if (!suratPernyataanLink || suratPernyataanLink.length < 15) {
        errors.push('Link Surat Pernyataan (Google Drive)');
    }
    
    // Validate NIK length
    const nik = document.getElementById('nik').value;
    if (nik && nik.length !== 16) {
        errors.push('NIK harus 16 digit');
    }
    
    // Validate email format
    const email = document.getElementById('email').value;
    if (email && !isValidEmail(email)) {
        errors.push('Format email tidak valid');
    }
    
    if (errors.length > 0) {
        alert('Mohon lengkapi field berikut:\n\n• ' + errors.join('\n• '));
        return false;
    }
    
    return true;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showConfirmation() {
    if (!validateForm()) return;
    
    // Get Drive links for confirmation
    const fotoLink = document.getElementById('foto-drive-link')?.value?.trim();
    const dokumenLink = document.getElementById('dokumen-drive-link')?.value?.trim();
    const suratLink = document.getElementById('surat-pernyataan-link')?.value?.trim();
    
    // Build confirmation list
    const confirmList = document.getElementById('confirm-list');
    confirmList.innerHTML = `
        <div class="confirm-item"><span class="confirm-label">No. Register</span><span class="confirm-value">${document.getElementById('reg-nomor').value}</span></div>
        <div class="confirm-item"><span class="confirm-label">Waktu Pengajuan</span><span class="confirm-value">${document.getElementById('reg-tanggal').value}</span></div>
        <div class="confirm-item"><span class="confirm-label">NIK</span><span class="confirm-value">${document.getElementById('nik').value}</span></div>
        <div class="confirm-item"><span class="confirm-label">Nama Lengkap</span><span class="confirm-value">${document.getElementById('nama-lengkap').value}</span></div>
        <div class="confirm-item"><span class="confirm-label">Tempat, Tgl Lahir</span><span class="confirm-value">${document.getElementById('tempat-lahir').value}, ${formatDate(document.getElementById('tanggal-lahir').value)}</span></div>
        <div class="confirm-item"><span class="confirm-label">Pekerjaan</span><span class="confirm-value">${document.getElementById('pekerjaan').value}</span></div>
        <div class="confirm-item"><span class="confirm-label">Unit Kerja</span><span class="confirm-value">${document.getElementById('unit-kerja').value}</span></div>
        <div class="confirm-item"><span class="confirm-label">Jurusan Tujuan</span><span class="confirm-value">${document.getElementById('jurusan-tujuan').value}</span></div>
        <div class="confirm-item"><span class="confirm-label">Jenjang</span><span class="confirm-value">${document.getElementById('jenjang-pendidikan').value}</span></div>
        <div class="confirm-item"><span class="confirm-label">Durasi Studi</span><span class="confirm-value">${document.getElementById('rencana-tahun').value}</span></div>
        <div class="confirm-item"><span class="confirm-label">No. HP/WA</span><span class="confirm-value">${document.getElementById('no-hp').value} / ${document.getElementById('no-wa').value}</span></div>
        <div class="confirm-item"><span class="confirm-label">Email</span><span class="confirm-value">${document.getElementById('email').value}</span></div>
        
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
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div> Mengirim...';
    
    // Validate Google Drive links are provided (NEW! - replacing file upload checks)
    const fotoLink = document.getElementById('foto-drive-link')?.value?.trim();
    const dokumenLink = document.getElementById('dokumen-drive-link')?.value?.trim();
    
    if (!fotoLink || fotoLink.length < 15) {
        showToast('❌ Silakan isi link Google Drive foto pasfoto!', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Ya, Kirim Sekarang';
        return;
    }
    
    if (!dokumenLink || dokumenLink.length < 15) {
        showToast('❌ Silakan upload dokumen PDF terlebih dahulu!', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Ya, Kirim Sekarang';
        return;
    }
    
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
        
        // GOOGLE DRIVE LINKS (NEW! - replacing base64 files)
        fotoDriveLink: document.getElementById('foto-drive-link')?.value?.trim(),           // Link foto pasfoto
        dokumenDriveLink: document.getElementById('dokumen-drive-link')?.value?.trim(),     // Link dokumen PDF
        suratPernyataanLink: document.getElementById('surat-pernyataan-link')?.value?.trim(), // Link surat pernyataan
        templateDriveLink: document.getElementById('template-drive-link')?.value?.trim(),     // Link template (optional)
        
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
        // Send to Supabase
        console.log('🚀 Mengirim ke Supabase...');
        
        if (supabaseClient) {
            const result = await submitToSupabase(formData);
            
            console.log('✅ Berhasil disimpan ke Supabase!', result);
            
            // Show success modal
            closeModal('confirm-modal');
            document.getElementById('success-reg-number').textContent = formData.noRegister;
            document.getElementById('success-modal').classList.add('active');
            showToast('✅ Pengajuan berhasil dikirim!', 'success');
            
        } else {
            // Fallback to localStorage
            console.log('💾 Menyimpan ke localStorage (Supabase tidak terhubung)...');
            saveToLocal(formData);
            
            closeModal('confirm-modal');
            document.getElementById('success-reg-number').textContent = formData.noRegister;
            document.getElementById('success-modal').classList.add('active');
            showToast('📝 Data tersimpan locally (Supabase belum terkonfigurasi)', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error submitting form:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            hint: error.hint,
            details: error.details
        });
        
        // Handle QuotaExceededError specifically
        if (error.name === 'QuotaExceededError' || error.message?.includes('quota') || error.message?.includes('penyimpanan terbatas')) {
            console.error('[SIMBAKES] 💥 QUOTA EXCEEDED ERROR - LocalStorage penuh!');
            
            closeModal('confirm-modal');
            document.getElementById('success-reg-number').textContent = formData.noRegister;
            document.getElementById('success-modal').classList.add('active');
            
            showToast('💾 Penyimpanan browser penuh! Data tidak tersimpan. Silakan hapus cache browser.', 'error');
            
            // Show user-friendly solution
            setTimeout(() => {
                alert('⚠️ PENYIMPANAN PENUH\n\nBrowser Anda kehabisan ruang penyimpanan.\n\n🔧 SOLUSI:\n\n1. Buka Developer Tools (F12)\n2. Pilih tab "Application"\n3. Di sidebar, pilih "Local Storage"\n4. Klik kanan > Clear\n\nAtau:\n• Gunakan mode Incognito/Private\n• Clear cache browser untuk site ini');
            }, 500);
            
            return;  // Stop here, don't try to save
        }
        
        // Handle Supabase-specific errors
        const isSupabaseError = error.code || error.message?.includes('Supabase') || 
                                error.message?.includes('constraint') || error.message?.includes('column') ||
                                error.message?.includes('relation') || error.message?.includes('null') ||
                                error.message?.includes('400');
        
        if (isSupabaseError) {
            console.error('[SIMBAKES] 💥 SUPABASE ERROR DETECTED:', error);
            
            let errorMessage = `❌ GAGAL MENYIMPAN KE DATABASE!\n\n`;
            
            // Error details
            if (error.code) {
                errorMessage += `🔴 Error Code: ${error.code}\n`;
            }
            errorMessage += `📝 Pesan: ${error.message || 'Unknown error'}\n`;
            
            if (error.hint) {
                errorMessage += `\n💡 Hint: ${error.hint}\n`;
            }
            
            if (error.details) {
                errorMessage += `📋 Detail: ${error.details}\n`;
            }
            
            // Specific error solutions
            if (error.code === '23505') {
                errorMessage += `\n\n⚠️ SOLUSI - Data Duplikat:`;
                errorMessage += `\n→ Nomor register atau NIK sudah terdaftar`;
                errorMessage += `\n→ Gunakan nomor register yang berbeda`;
            } else if (error.code === '22007' || error.message?.includes('invalid input syntax for type date')) {
                errorMessage += `\n\n⚠️ SOLUSI - Format Tanggal Tidak Valid (Error 22007):`;
                errorMessage += `\n→ Format tanggal Indonesia tidak didukung oleh database`;
                errorMessage += `\n→ Solusi 1: Jalankan script SQL untuk mengubah kolom ke TEXT:`;
                errorMessage += `\n   /download/simbakes_fix_submissions_table.sql`;
                errorMessage += `\n   (Lihat bagian "2b. FIX DATE COLUMNS")`;
                errorMessage += `\n→ Solusi 2: Atau refresh halaman ini (sudah ada fix otomatis di JavaScript)`;
            } else if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
                errorMessage += `\n\n⚠️ SOLUSI - Kolom Tidak Ditemukan:`;
                errorMessage += `\n→ Jalankan script SQL di Supabase Editor:`;
                errorMessage += `\n   /download/simbakes_fix_submissions_table.sql`;
                errorMessage += `\n→ Script ini akan membuat semua kolom yang diperlukan`;
            } else if (error.code === '23502' || error.message?.includes('null')) {
                errorMessage += `\n\n⚠️ SOLUSI - Field Wajib Kosong:`;
                errorMessage += `\n→ Pastikan NIK dan nama_lengkap terisi`;
                errorMessage += `\n→ Pastikan no_register tidak kosong`;
            } else if (error.message?.includes('400') || error.status === 400) {
                errorMessage += `\n\n⚠️ SOLUSI - Bad Request (Error 400):`;
                errorMessage += `\n→ Struktur tabel mungkin tidak sesuai`;
                errorMessage += `\n→ Jalankan script: simbakes_fix_submissions_table.sql`;
                errorMessage += `\n→ Periksa RLS policies di Supabase Dashboard`;
            } else {
                errorMessage += `\n\n📋 LANGKAH PERBAIKAN:`;
                errorMessage += `\n1. Buka Supabase Dashboard → SQL Editor`;
                errorMessage += `\n2. Copy-paste isi file: simbakes_fix_submissions_table.sql`;
                errorMessage += `\n3. Run script tersebut`;
                errorMessage += `\n4. Coba submit form kembali`;
            }
            
            errorMessage += `\n\n🔧 DEBUG INFO (untuk admin):`;
            errorMessage += `\n• Buka F12 → Console tab`;
            errorMessage += `\n• Cari log: [SIMBAKES] ❌ Supabase Insert Error`;
            errorMessage += `\n• Lihat detail error lengkap di sana`;
            
            alert(errorMessage);
            
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Ya, Kirim Sekarang';
            return;
        }
        
        // Fallback to local storage on other errors (with try-catch)
        try {
            console.log('🔄 Fallback: Menyimpan ke localStorage...');
            saveToLocal(formData);
            
            closeModal('confirm-modal');
            document.getElementById('success-reg-number').textContent = formData.noRegister;
            document.getElementById('success-modal').classList.add('active');
            
            showToast(`⚠️ Gagal ke Supabase: ${error.message}. Data tersimpan locally.`, 'warning');
            
        } catch (localError) {
            console.error('❌ Gagal menyimpan locally juga:', localError);
            
            closeModal('confirm-modal');
            
            // Show detailed error to user
            alert(`❌ GAGAL MENYIMPAN DATA!\n\nError: ${error.message}\n\nDetail Error Local:\n${localError.message}\n\nSolusi:\n1. Refresh halaman dan coba lagi\n2. Hapus cache browser (Ctrl+Shift+Delete)\n3. Gunakan mode Incognito\n4. Hubungi admin jika masalah berlanjut`);
        }
        
        console.error('Detail Error:', {
            message: error.message,
            supabaseConnected: !!supabaseClient,
            timestamp: new Date().toISOString()
        });
        
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Ya, Kirim Sekarang';
    }
}

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
        
        // Dokumen/Files (support both old base64 and new drive links)
        foto: getField(found, 'foto', 'foto_drive_link', 'fotoDriveLink', '-'),
        dokumen_pdf: getField(found, 'dokumen_pdf', 'dokumen_drive_link', 'dokumenDriveLink', '-'),
        nama_file: getField(found, 'nama_file', 'namaFile', '-'),
        
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
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">foto</span>
                        <strong style="color:#334155;font-size:0.8rem;word-break:break-all;">${data.foto && data.foto !== '-' && data.foto.length > 10 ? '<a href="' + data.foto + '" target="_blank" style="color:#3b82f6;">📷 Link Tersedia</a>' : (data.foto || '-')}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">dokumen_pdf</span>
                        <strong style="color:#334155;font-size:0.8rem;word-break:break-all;">${data.dokumen_pdf && data.dokumen_pdf !== '-' && data.dokumen_pdf.length > 10 ? '<a href="' + data.dokumen_pdf + '" target="_blank" style="color:#10b981;">📄 Link Tersedia</a>' : (data.dokumen_pdf || '-')}</strong>
                    </div>
                    <div style="background:white;padding:0.6rem;border-radius:8px;border:1px solid #e2e8f0;">
                        <span style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05px;display:block;margin-bottom:0.2rem;">nama_file</span>
                        <strong style="color:#334155;font-size:0.8rem;">${data.nama_file || '-'}</strong>
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



