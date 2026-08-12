/**
 * SIMBAKES - Storage Module (Supabase Storage)
 * Beasiswa Tematik Bidang Kesehatan
 * 
 * Modul ini menyediakan:
 * - Upload file ke Supabase Storage
 * - Download file dari Supabase Storage
 * - Generate public URL
 * - Delete file dari Storage
 */

// ============================================================
// STORAGE CONFIGURATION
// ============================================================

const STORAGE_CONFIG = {
    // Bucket name (sesuai dengan setup di Supabase)
    BUCKET_NAME: 'simbakes',
    
    // Folder structure
    FOLDERS: {
        PASFOTO: 'pasfoto',
        DOKUMEN: 'dokumen'
    },
    
    // File type restrictions
    ALLOWED_TYPES: {
        pasfoto: ['jpg', 'jpeg', 'png', 'webp'],
        dokumen: ['pdf', 'jpg', 'jpeg', 'png']
    },
    
    // Size limits in MB
    MAX_SIZE: {
        pasfoto: 2,      // 2MB
        dokumen: 5       // 5MB
    },
    
    // Image dimension requirements (for pasfoto)
    DIMENSIONS: {
        pasfoto: {
            minWidth: 300,
            minHeight: 400
        }
    },
    
    // Cache control (in seconds)
    CACHE_CONTROL: 3600 // 1 hour
};


// ============================================================
// STORAGE CLASS
// ============================================================

class SimbakesStorage {
    constructor() {
        this.client = null;
    }
    
    /**
     * Initialize storage client
     */
    init() {
        if (!this.client) {
            this.client = getSupabaseClient();
        }
        return this;
    }
    
    /**
     * Ensure client is initialized
     */
    getClient() {
        if (!this.client) {
            this.init();
        }
        return this.client;
    }
    
    /**
     * Upload pasfoto (photo)
     * @param {File} file - File to upload
     * @param {string} nik - NIK of the user
     * @returns {Promise<Object>} { success, url, error, path }
     */
    async uploadPasfoto(file, nik) {
        const client = this.getClient();
        
        try {
            // Validate file type
            const ext = file.name.split('.').pop().toLowerCase();
            if (!STORAGE_CONFIG.ALLOWED_TYPES.pasfoto.includes(ext)) {
                return {
                    success: false,
                    error: `Tipe file tidak diizinkan. Gunakan: ${STORAGE_CONFIG.ALLOWED_TYPES.pasfoto.join(', ')}`,
                    url: null,
                    path: null
                };
            }
            
            // Validate file size
            if (file.size > STORAGE_CONFIG.MAX_SIZE.pasfoto * 1024 * 1024) {
                return {
                    success: false,
                    error: `Ukuran file terlalu besar. Maksimal ${STORAGE_CONFIG.MAX_SIZE.pasfoto}MB`,
                    url: null,
                    path: null
                };
            }
            
            // Validate image dimensions
            const dimCheck = await Validate.imageDimensions(
                file, 
                STORAGE_CONFIG.DIMENSIONS.pasfoto.minWidth,
                STORAGE_CONFIG.DIMENSIONS.pasfoto.minHeight
            );
            
            if (!dimCheck.valid) {
                return {
                    success: false,
                    error: dimCheck.message,
                    url: null,
                    path: null
                };
            }
            
            // Generate unique filename
            const timestamp = Date.now();
            const filename = `pasfoto_${timestamp}.${ext}`;
            const path = `${STORAGE_CONFIG.FOLDERS.PASFOTO}/${nik}/${filename}`;
            
            // Upload to Supabase Storage
            const { data, error } = await client.storage
                .from(STORAGE_CONFIG.BUCKET_NAME)
                .upload(path, file, {
                    cacheControl: `${STORAGE_CONFIG.CACHE_CONTROL}`,
                    upsert: false
                });
            
            if (error) throw error;
            
            // Get public URL
            const url = this.getPublicUrl(path);
            
            console.log('✅ Pasfoto uploaded:', path);
            
            return {
                success: true,
                url: url,
                path: path,
                error: null
            };
            
        } catch (error) {
            console.error('❌ Pasfoto upload error:', error);
            return {
                success: false,
                error: error.message || 'Gagal mengupload pasfoto',
                url: null,
                path: null
            };
        }
    }
    
    /**
     * Upload dokumen (document/PDF)
     * @param {File} file - File to upload
     * @param {string} nik - NIK of the user
     * @returns {Promise<Object>} { success, url, error, path }
     */
    async uploadDokumen(file, nik) {
        const client = this.getClient();
        
        try {
            // Validate file type
            const ext = file.name.split('.').pop().toLowerCase();
            if (!STORAGE_CONFIG.ALLOWED_TYPES.dokumen.includes(ext)) {
                return {
                    success: false,
                    error: `Tipe file tidak diizinkan. Gunakan: ${STORAGE_CONFIG.ALLOWED_TYPES.dokumen.join(', ')}`,
                    url: null,
                    path: null
                };
            }
            
            // Validate file size
            if (file.size > STORAGE_CONFIG.MAX_SIZE.dokumen * 1024 * 1024) {
                return {
                    success: false,
                    error: `Ukuran file terlalu besar. Maksimal ${STORAGE_CONFIG.MAX_SIZE.dokumen}MB`,
                    url: null,
                    path: null
                };
            }
            
            // Generate unique filename
            const timestamp = Date.now();
            const filename = `dokumen_${timestamp}.${ext}`;
            const path = `${STORAGE_CONFIG.FOLDERS.DOKUMEN}/${nik}/${filename}`;
            
            // Upload to Supabase Storage
            const { data, error } = await client.storage
                .from(STORAGE_CONFIG.BUCKET_NAME)
                .upload(path, file, {
                    cacheControl: `${STORAGE_CONFIG.CACHE_CONTROL}`,
                    upsert: false
                });
            
            if (error) throw error;
            
            // Get public URL
            const url = this.getPublicUrl(path);
            
            console.log('✅ Dokumen uploaded:', path);
            
            return {
                success: true,
                url: url,
                path: path,
                error: null
            };
            
        } catch (error) {
            console.error('❌ Dokumen upload error:', error);
            return {
                success: false,
                error: error.message || 'Gagal mengupload dokumen',
                url: null,
                path: null
            };
        }
    }
    
    /**
     * Get public URL for a file
     * @param {string} path - File path in bucket
     * @returns {string} Public URL
     */
    getPublicUrl(path) {
        const client = this.getClient();
        
        const { data } = client.storage
            .from(STORAGE_CONFIG.BUCKET_NAME)
            .getPublicUrl(path);
        
        return data.publicUrl;
    }
    
    /**
     * Get signed URL for private files (expires after set time)
     * @param {string} path - File path in bucket
     * @param {number} expiresIn - Seconds until expiry (default: 3600 = 1 hour)
     * @returns {Promise<string>} Signed URL
     */
    async getSignedUrl(path, expiresIn = 3600) {
        const client = this.getClient();
        
        const { data, error } = await client.storage
            .from(STORAGE_CONFIG.BUCKET_NAME)
            .createSignedUrl(path, expiresIn);
        
        if (error) throw error;
        
        return data.signedUrl;
    }
    
    /**
     * Delete file from storage
     * @param {string} path - File path to delete
     * @returns {Promise<Object>} { success, error }
     */
    async deleteFile(path) {
        const client = this.getClient();
        
        try {
            const { error } = await client.storage
                .from(STORAGE_CONFIG.BUCKET_NAME)
                .remove([path]);
            
            if (error) throw error;
            
            console.log('✅ File deleted:', path);
            
            return { success: true, error: null };
            
        } catch (error) {
            console.error('❌ Delete file error:', error);
            return {
                success: false,
                error: error.message || 'Gagal menghapus file'
            };
        }
    }
    
    /**
     * List all files for a specific user/NIK
     * @param {string} nik - NIK of the user
     * @param {string} folder - Folder name (pasfoto or dokumen)
     * @returns {Promise<Array>} List of files
     */
    async listUserFiles(nik, folder) {
        const client = this.getClient();
        
        try {
            const { data, error } = await client.storage
                .from(STORAGE_CONFIG.BUCKET_NAME)
                .list(`${folder}/${nik}`);
            
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('❌ List files error:', error);
            return [];
        }
    }
    
    /**
     * Download file as blob
     * @param {string} path - File path
     * @returns {Promise<Blob>} File blob
     */
    async downloadFile(path) {
        const client = this.getClient();
        
        const { data, error } = await client.storage
            .from(STORAGE_CONFIG.BUCKET_NAME)
            .download(path);
        
        if (error) throw error;
        
        return data;
    }
    
    /**
     * Create download link for user
     * @param {string} url - Public URL or signed URL
     * @param {string} filename - Suggested filename
     */
    triggerDownload(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


// ============================================================
// FILE PREVIEW HELPERS
// ============================================================

/**
 * Preview image before upload
 * @param {File} file - Image file
 * @param {string} imgElementId - ID of img element
 * @returns {Promise<boolean>} Success status
 */
async function previewImage(file, imgElementId) {
    const imgEl = document.getElementById(imgElementId);
    if (!imgEl) return false;
    
    try {
        // Validate it's an image
        if (!file.type.startsWith('image/')) {
            console.error('File is not an image');
            return false;
        }
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        imgEl.src = previewUrl;
        imgEl.style.display = 'block';
        imgEl.onload = () => {
            URL.revokeObjectURL(previewUrl);
        };
        
        return true;
    } catch (error) {
        console.error('Preview error:', error);
        return false;
    }
}

/**
 * Remove image preview
 * @param {string} imgElementId - ID of img element
 */
function removeImagePreview(imgElementId) {
    const imgEl = document.getElementById(imgElementId);
    if (imgEl) {
        imgEl.src = '';
        imgEl.style.display = 'none';
    }
}

/**
 * Display file info (name, size)
 * @param {File} file - Selected file
 * @param {string} containerId - ID of info container element
 */
function displayFileInfo(file, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const ext = file.name.split('.').pop().toUpperCase();
    const size = Format.fileSize(file.size);
    
    container.innerHTML = `
        <div class="file-info">
            <i class="fas fa-file-${getFileIcon(ext)}"></i>
            <div class="file-details">
                <span class="file-name">${Format.escapeHtml(file.name)}</span>
                <span class="file-meta">${ext} • ${size}</span>
            </div>
            <button type="button" class="btn-remove-file" onclick="removeFileInfo('${containerId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.style.display = 'block';
}

/**
 * Remove file info display
 * @param {string} containerId - ID of info container element
 */
function removeFileInfo(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
    
    // Also clear the associated file input
    const inputId = containerId.replace('Info', '');
    const inputEl = document.getElementById(inputId);
    if (inputEl) inputEl.value = '';
}

/**
 * Get Font Awesome icon class based on file extension
 */
function getFileIcon(extension) {
    const iconMap = {
        'PDF': 'pdf',
        'JPG': 'image',
        'JPEG': 'image',
        'PNG': 'image',
        'WEBP': 'image',
        'DOC': 'word',
        'DOCX': 'word',
        'XLS': 'excel',
        'XLSX': 'excel'
    };
    
    return iconMap[extension] || 'alt';
}


// ============================================================
// CREATE GLOBAL INSTANCE & EXPORT
// ============================================================

const simbakesStorage = new SimbakesStorage();

window.simbakesStorage = simbakesStorage;
window.STORAGE_CONFIG = STORAGE_CONFIG;
window.previewImage = previewImage;
window.removeImagePreview = removeImagePreview;
window.displayFileInfo = displayFileInfo;
window.removeFileInfo = removeFileInfo;
