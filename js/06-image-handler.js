// ============================================================
// 🖼️ GOOGLE DRIVE IMAGE HANDLER v2.0 - COMPREHENSIVE SYSTEM
// ============================================================
// Fitur:
// - Deteksi otomatis SEMUA format URL Google Drive
// - Ekstrak FILE_ID dari berbagai pola URL
// - 7+ endpoint fallback dengan thumbnail & high-res
// - Lazy loading dengan Intersection Observer
// - Aspect ratio preservation
// - Smart error handling (permission, private, broken)
// - Placeholder dengan animasi
// - Cache optimization
// ============================================================

/**
 * ENHANCED: Ekstrak File ID dari SEMUA format Google Drive URL
 * Mendukung:
 * - Standard: drive.google.com/file/d/FILE_ID/view
 * - Open: drive.google.com/open?id=FILE_ID
 * - UC Export: drive.google.com/uc?export=view&id=FILE_ID
 * - Short: docs.google.com/file/d/FILE_ID
 * - Direct ID: FILE_ID saja (33 karakter)
 * - Thumbnail: drive.google.com/thumbnail?id=FILE_ID
 * - Folder sharing: drive.google.com/drive/folders/FILE_ID
 * - Sharing link: https://drive.google.com/file/d/FILE_ID?usp=sharing
 * - Embed: https://drive.google.com/file/d/FILE_ID/preview
 */
function extractFileIdEnhanced(driveUrl) {
    if (!driveUrl || driveUrl === '-' || typeof driveUrl !== 'string') return '';
    
    const url = driveUrl.trim();
    let fileId = '';
    
    // Pattern 1: /file/d/FILE_ID/view atau /file/d/FILE_ID/?usp=sharing
    const match1 = url.match(/\/file\/d\/([a-zA-Z0-9-_]{25,})/);
    if (match1 && match1[1]) fileId = match1[1];
    
    // Pattern 2: ?id=FILE_ID or &id=FILE_ID (parameter)
    if (!fileId) {
        const match2 = url.match(/[?&]id=([a-zA-Z0-9-_]{25,})/);
        if (match2 && match2[1]) fileId = match2[1];
    }
    
    // Pattern 3: /d/FILE_ID (shortened URL / direct path)
    if (!fileId) {
        const match3 = url.match(/\/d\/([a-zA-Z0-9-_]{33})/);
        if (match3 && match3[1]) fileId = match3[1];
    }
    
    // Pattern 4: open?id=FILE_ID
    if (!fileId) {
        const match4 = url.match(/open\?id=([a-zA-Z0-9-_]{25,})/);
        if (match4 && match4[1]) fileId = match4[1];
    }
    
    // Pattern 5: thumbnails.googleusercontent.com/vi/FILE_ID/
    if (!fileId) {
        const match5 = url.match(/thumbnails\.googleusercontent\.com\/vi\/([a-zA-Z0-9-_]+)/);
        if (match5 && match5[1]) fileId = match5[1];
    }
    
    // Pattern 6: lh3.googleusercontent.com/d/FILE_ID=
    if (!fileId) {
        const match6 = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9-_]+)/);
        if (match6 && match6[1]) fileId = match6[1];
    }
    
    // Pattern 7: Jika URL sendiri adalah FILE_ID (33 karakter alphanumeric)
    if (!fileId && /^[a-zA-Z0-9-_]{25,}$/.test(url)) {
        fileId = url;
    }
    
    // Pattern 8: googleusercontent.com/a/.../FILE_ID (shared via Gmail/Drive)
    if (!fileId) {
        const match8 = url.match(/googleusercontent\.com\/a\/[^/]+\/[^/]+\/([a-zA-Z0-9-_]+)/);
        if (match8 && match8[1]) fileId = match8[1];
    }
    
    return fileId;
}

/**
 * Generate MULTIPLE Google Drive image URLs untuk sebuah File ID
 * Urutan berdasarkan reliabilitas (paling reliable pertama)
 * 
 * @param {string} fileId - Google Drive File ID
 * @param {string} size - 'thumb' (100px), 'small' (200px), 'medium' (500px), 'large' (1000px), 'max' (2200px)
 * @returns {string[]} Array of URLs to try in order
 */
function generateDriveImageUrls(fileId, size = 'medium') {
    if (!fileId) return [];
    
    // Size mapping untuk berbagai endpoint
    const sizeMap = {
        thumb: { lh3: 'w100-h100', uc: 'w100', thumb: 'w100', api: '100' },
        small: { lh3: 'w200-h200', uc: 'w200', thumb: 'w200', api: '200' },
        medium: { lh3: 'w400-h400', uc: 'w400', thumb: 'w400', api: '400' },
        large: { lh3: 'w800-h800', uc: 'w800', thumb: 'w800', api: '800' },
        max: { lh3: 's2200', uc: 'w2200-h1500', thumb: 'w2200-h1500', api: '2200' }
    };
    
    const s = sizeMap[size] || sizeMap.medium;
    
    return [
        // ENDPOINT 1: LH3 Google Content (THUMBNAIL SERVICE) - PALING RELIABLE
        `https://lh3.googleusercontent.com/d/${fileId}=${s.lh3}`,
        
        // ENDPOINT 2: Drive UC Export (View Mode) - BACKUP UTAMA
        `https://drive.google.com/thumbnail?id=${fileId}&sz=${s.thumb}`,
        
        // ENDPOINT 3: Drive UC Export dengan authkey support
        `https://drive.google.com/uc?export=view&id=${fileId}`,
        
        // ENDPOINT 4: Google Thumbnails API
        `https://thumbnails.googleusercontent.com/vi/${fileId}/${s.thumb}`,
        
        // ENDPOINT 5: LH3 alternative format (tanpa parameter)
        `https://lh3.googleusercontent.com/p/${fileId}`,
        
        // ENDPOINT 6: Docs viewer sebagai image (fallback)
        `https://docs.google.com/document/d/${fileId}/preview`,
        
        // ENDPOINT 7: Web proxy via Google (last resort)
        `https://drive.google.com/uc?export=download&id=${fileId}`
    ];
}

/**
 * Detect jika URL adalah Google Drive URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
function isGoogleDriveUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.includes('drive.google.com') || 
           url.includes('googleusercontent.com') ||
           url.includes('google.com/file/d/') ||
           url.includes('docs.google.com');
}

/**
 * Get best image URL for display
 * Konversi otomatis Google Drive URL ke format yang kompatibel
 * 
 * @param {string} photoUrl - Original URL from database
 * @param {string} size - Size preference: 'thumb', 'small', 'medium', 'large', 'max'
 * @returns {string} Best URL to use (or empty string if invalid)
 */
function getBestImageUrl(photoUrl, size = 'medium') {
    if (!photoUrl || photoUrl === '-' || photoUrl.length < 10) return '';
    
    // Jika sudah data URL (base64), return as-is
    if (photoUrl.startsWith('data:image/')) return photoUrl;
    
    // Jika sudah direct URL dan bukan drive/google, return as-is
    if (photoUrl.startsWith('http') && !isGoogleDriveUrl(photoUrl)) return photoUrl;
    
    // Jika sudah googleusercontent URL dengan ukuran, return as-is
    if (photoUrl.includes('lh3.googleusercontent.com') && photoUrl.includes('=')) return photoUrl;
    
    // Extract file ID dan generate best URL
    const fileId = extractFileIdEnhanced(photoUrl);
    
    if (fileId) {
        const urls = generateDriveImageUrls(fileId, size);
        return urls[0] || ''; // Return most reliable URL
    }
    
    // Tidak bisa extract, return original (mungkin sudah direct URL)
    return photoUrl;
}

/**
 * Create SMART PHOTO ELEMENT with comprehensive features:
 * - Automatic Google Drive URL conversion
 * - Multi-level fallback (tries all endpoints)
 * - Lazy loading with Intersection Observer
 * - Aspect ratio preservation
 * - Loading skeleton animation
 * - Error handling with clear messages
 * - Click to open full resolution
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.url - Original photo URL from database
 * @param {string} options.alt - Alt text for accessibility
 * @param {string} options.size - 'thumb'|'small'|'medium'|'large'|'max'
 * @param {boolean} options.lazy - Enable lazy loading (default: true)
 * @param {boolean} options.clickable - Enable click to zoom (default: true)
 * @param {string} options.className - Additional CSS classes
 * @param {Function} options.onError - Custom error callback
 * @returns {HTMLElement} Container div with image
 */
function createSmartPhotoElement(options = {}) {
    const {
        url: originalUrl,
        alt = 'Foto',
        size = 'medium',
        lazy = true,
        clickable = true,
        className = '',
        onError = null
    } = options;
    
    // Create container
    const container = document.createElement('div');
    container.className = `smart-photo-container smart-photo-${size} ${className}`.trim();
    container.setAttribute('data-photo-state', 'loading');
    
    // Validate URL
    if (!originalUrl || originalUrl === '-' || originalUrl.length < 10) {
        container.setAttribute('data-photo-state', 'placeholder');
        container.innerHTML = `
            <div class="smart-photo-placeholder">
                <span class="smart-photo-placeholder-icon">👤</span>
                <span class="smart-photo-placeholder-text">Tidak ada foto</span>
            </div>
        `;
        return container;
    }
    
    // Store original URL for reference
    container.setAttribute('data-original-url', originalUrl);
    
    // Create loading skeleton
    const skeleton = document.createElement('div');
    skeleton.className = 'smart-photo-skeleton';
    skeleton.innerHTML = `
        <div class="skeleton-animation"></div>
        <span class="skeleton-text">Memuat foto...</span>
    `;
    container.appendChild(skeleton);
    
    // Create actual image element (hidden initially)
    const img = document.createElement('img');
    img.className = 'smart-photo-img';
    img.alt = alt;
    img.setAttribute('data-original-url', originalUrl);
    img.style.display = 'none';
    container.appendChild(img);
    
    // Create placeholder (shown on error)
    const placeholder = document.createElement('div');
    placeholder.className = 'smart-photo-placeholder smart-photo-error';
    placeholder.style.display = 'none';
    placeholder.innerHTML = `
        <span class="smart-photo-placeholder-icon">📷</span>
        <span class="smart-photo-placeholder-text">Foto tidak tersedia</span>
        <span class="smart-photo-error-hint">File mungkin privat atau dihapus</span>
    `;
    container.appendChild(placeholder);
    
    // Function to try loading image with fallback chain
    async function loadWithFallback() {
        container.setAttribute('data-photo-state', 'loading');
        skeleton.style.display = 'flex';
        img.style.display = 'none';
        placeholder.style.display = 'none';
        
        // Get all possible URLs
        const fileId = extractFileIdEnhanced(originalUrl);
        let urlsToTry = [];
        
        if (fileId) {
            urlsToTry = generateDriveImageUrls(fileId, size);
        } else {
            // Not a Drive URL, try as-is
            urlsToTry = [originalUrl];
        }
        
        // Try each URL sequentially
        let loaded = false;
        
        for (let i = 0; i < urlsToTry.length; i++) {
            if (loaded) break;
            
            const currentUrl = urlsToTry[i];
            
            try {
                const success = await new Promise((resolve) => {
                    const testImg = new Image();
                    const timeout = setTimeout(() => resolve(false), 6000); // 6s timeout per attempt
                    
                    testImg.onload = () => {
                        clearTimeout(timeout);
                        // Validasi: gambar harus memiliki dimensi yang wajar
                        if (testImg.naturalWidth > 20 && testImg.naturalHeight > 20) {
                            resolve(true);
                        } else {
                            console.warn(`⚠️ URL ${i+1} returned invalid dimensions:`, currentUrl.substring(0, 50));
                            resolve(false);
                        }
                    };
                    
                    testImg.onerror = (e) => {
                        clearTimeout(timeout);
                        console.warn(`⚠️ URL ${i+1} failed:`, currentUrl.substring(0, 50));
                        resolve(false);
                    };
                    
                    testImg.src = currentUrl;
                });
                
                if (success) {
                    img.src = currentUrl;
                    img.style.display = 'block';
                    skeleton.style.display = 'none';
                    placeholder.style.display = 'none';
                    container.setAttribute('data-photo-state', 'loaded');
                    loaded = true;
                    
                    // Cache successful URL
                    const cacheKey = originalUrl.substring(0, 100);
                    if (!window._photoSuccessCache) window._photoSuccessCache = new Map();
                    window._photoSuccessCache.set(cacheKey, currentUrl);
                    
                    console.log(`✅ Photo loaded via method ${i + 1}:`, currentUrl.substring(0, 60));
                    break;
                }
                
            } catch (err) {
                console.warn(`⚠️ Error trying URL ${i + 1}:`, err.message);
            }
            
            // Small delay between attempts
            if (i < urlsToTry.length - 1) {
                await new Promise(r => setTimeout(r, 150));
            }
        }
        
        // All URLs failed
        if (!loaded) {
            img.style.display = 'none';
            skeleton.style.display = 'none';
            placeholder.style.display = 'flex';
            container.setAttribute('data-photo-state', 'error');
            
            // Mark in fail cache
            if (!window._photoFailCache) window._photoFailCache = new Set();
            window._photoFailCache.add(originalUrl.substring(0, 100));
            
            // Call custom error handler if provided
            if (typeof onError === 'function') {
                onError(originalUrl, 'All endpoints failed');
            }
            
            console.warn('❌ All photo loading methods failed for:', originalUrl.substring(0, 50));
        }
    }
    
    // Lazy loading with Intersection Observer
    if (lazy && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    observer.unobserve(container);
                    loadWithFallback();
                }
            });
        }, { rootMargin: '50px' });
        
        observer.observe(container);
    } else {
        // No lazy load, load immediately
        loadWithFallback();
    }
    
    // Click to open full resolution
    if (clickable) {
        container.style.cursor = 'pointer';
        container.addEventListener('click', (e) => {
            e.stopPropagation();
            if (container.getAttribute('data-photo-state') === 'loaded') {
                openPhotoModal(img.src, alt, originalUrl);
            }
        });
    }
    
    return container;
}

/**
 * Open Photo Modal with Full Resolution Image
 * Global function untuk membuka modal foto besar
 */
function openPhotoModal(src, alt = 'Foto', originalUrl = '') {
    // Remove existing modal
    const existing = document.getElementById('smart-photo-modal');
    if (existing) existing.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'smart-photo-modal';
    modal.className = 'smart-photo-modal-overlay';
    modal.innerHTML = `
        <div class="smart-photo-modal-content">
            <button class="smart-photo-modal-close" onclick="closePhotoModal()">&times;</button>
            <div class="smart-modal-image-wrapper">
                <img src="${src}" alt="${alt}" id="smart-modal-img" 
                     onerror="this.parentElement.innerHTML='<div style=\\'padding:40px;text-align:center;color:#94a3b8;\\'><div style=\\'font-size:4rem;\\'>📷</div><p>Gagal memuat foto</p></div>'">
            </div>
            <div class="smart-modal-info">
                <h4>${alt}</h4>
                ${originalUrl ? `<a href="${originalUrl}" target="_blank" class="smart-modal-link">🔗 Buka di Google Drive</a>` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closePhotoModal();
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closePhotoModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

/**
 * Close Photo Modal
 */
function closePhotoModal() {
    const modal = document.getElementById('smart-photo-modal');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => modal.remove(), 300);
    }
    document.body.style.overflow = '';
}

/**
 * Generate HTML string untuk Smart Photo (untuk digunakan di template literals)
 * Versi ringan yang tetap mendukung multi-fallback
 * 
 * @param {string} photoUrl - Original URL
 * @param {string} alt - Alt text
 * @param {string} size - Size: 'thumb', 'small', 'medium', 'large'
 * @returns {string} HTML string
 */
function generateSmartPhotoHtml(photoUrl, alt = '', size = 'small') {
    if (!photoUrl || photoUrl === '-' || photoUrl.length < 10) {
        return `<div class="smart-photo-container smart-photo-${size}" data-photo-state="placeholder">
            <div class="smart-photo-placeholder">
                <span class="smart-photo-placeholder-icon">👤</span>
            </div>
        </div>`;
    }
    
    const safeAlt = escapeHtml(alt || 'Foto');
    const safeUrl = escapeHtml(photoUrl);
    const bestUrl = getBestImageUrl(photoUrl, size);
    const safeBestUrl = escapeHtml(bestUrl);
    
    // Size classes
    const sizeClasses = {
        thumb: 'width:50px;height:50px;',
        small: 'width:60px;height:60px;',
        medium: 'width:120px;height:120px;',
        large: 'width:200px;height:200px;'
    };
    
    const inlineStyle = sizeClasses[size] || sizeClasses.small;
    
    return `<div class="smart-photo-container smart-photo-${size}" 
             data-photo-state="loading"
             data-original-url="${safeUrl}"
             style="${inlineStyle}">
        <div class="smart-photo-skeleton" style="${inlineStyle}">
            <div class="skeleton-animation"></div>
        </div>
        <img src="${safeBestUrl}" 
             alt="${safeAlt}"
             class="smart-photo-img"
             data-original-url="${safeUrl}"
             style="${inlineStyle}object-fit:cover;border-radius:8px;display:none;"
             onload="this.style.display='block';this.previousElementSibling.style.display='none';this.parentElement.dataset.photoState='loaded';"
             onerror="handleSmartPhotoError(this)">
        <div class="smart-photo-placeholder smart-photo-error" style="${inlineStyle}display:none;">
            <span class="smart-photo-placeholder-icon">👤</span>
        </div>
    </div>`;
}

/**
 * Global error handler untuk Smart Photo images
 * Tries fallback URLs sequentially
 */
window.handleSmartPhotoError = function(img) {
    const container = img.closest('.smart-photo-container');
    if (!container) return;
    
    const originalUrl = img.getAttribute('data-original-url');
    if (!originalUrl) {
        showPhotoErrorState(container);
        return;
    }
    
    // Get current URL index from data attribute
    let currentIndex = parseInt(container.getAttribute('data-url-index') || '0');
    const fileId = extractFileIdEnhanced(originalUrl);
    
    if (!fileId) {
        showPhotoErrorState(container);
        return;
    }
    
    // Get all possible URLs
    const allUrls = generateDriveImageUrls(fileId, 'medium');
    
    // Try next URL
    if (currentIndex < allUrls.length - 1) {
        currentIndex++;
        container.setAttribute('data-url-index', currentIndex.toString());
        
        const nextUrl = allUrls[currentIndex];
        console.log(`🔄 Trying fallback URL ${currentIndex + 1}:`, nextUrl.substring(0, 50));
        
        // Test URL first
        const testImg = new Image();
        testImg.onload = () => {
            if (testImg.naturalWidth > 20) {
                img.src = nextUrl;
                img.style.display = 'block';
                container.querySelector('.smart-photo-skeleton').style.display = 'none';
                container.querySelector('.smart-photo-placeholder').style.display = 'none';
                container.setAttribute('data-photo-state', 'loaded');
            } else {
                window.handleSmartPhotoError(img); // Try next
            }
        };
        testImg.onerror = () => window.handleSmartPhotoError(img); // Try next
        testImg.src = nextUrl;
    } else {
        // All URLs failed
        showPhotoErrorState(container);
    }
};

/**
 * Show error state for photo container
 */
function showPhotoErrorState(container) {
    if (!container) return;
    
    const img = container.querySelector('.smart-photo-img');
    const skeleton = container.querySelector('.smart-photo-skeleton');
    const placeholder = container.querySelector('.smart-photo-placeholder');
    
    if (img) img.style.display = 'none';
    if (skeleton) skeleton.style.display = 'none';
    if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.classList.add('smart-photo-error');
        placeholder.innerHTML = `
            <span class="smart-photo-placeholder-icon">📷</span>
            <span class="smart-photo-error-hint">Tidak dapat memuat</span>
        `;
    }
    
    container.setAttribute('data-photo-state', 'error');
}

/**
 * Initialize semua smart photos dalam container setelah render
 * Dipanggil manual setelah innerHTML assignment
 */
function initSmartPhotos(container) {
    if (!container) return;
    
    // Find all containers that need initialization
    const photos = container.querySelectorAll('.smart-photo-container[data-photo-state="loading"]');
    
    photos.forEach(photoContainer => {
        const img = photoContainer.querySelector('.smart-photo-img');
        const originalUrl = photoContainer.getAttribute('data-original-url');
        
        if (img && originalUrl) {
            // Trigger load with error handling
            img.onload = () => {
                img.style.display = 'block';
                const skeleton = photoContainer.querySelector('.smart-photo-skeleton');
                if (skeleton) skeleton.style.display = 'none';
                photoContainer.setAttribute('data-photo-state', 'loaded');
            };
            
            img.onerror = () => window.handleSmartPhotoError(img);
            
            // If src is empty, trigger error to start fallback
            if (!img.src || img.src === window.location.href) {
                window.handleSmartPhotoError(img);
            }
        }
    });
}

console.log('✅ Google Drive Image Handler v2.0 Loaded');

/**
 * DEPRECATED: Use generateSmartPhotoHtml() instead
 * Kept for backward compatibility - now delegates to new system
 */

/**
 * Sync version of setPhotoWithFallback untuk penggunaan sederhana
 * (tanpa await, langsung set src)
 */
function setPhotoSync(imgElement, placeholderElement, photoUrl) {
    // Validasi
    if (!photoUrl || photoUrl === '-' || photoUrl.length < 10) {
        imgElement.style.display = 'none';
        if (placeholderElement) placeholderElement.style.display = 'flex';
        return;
    }
    
    // Jika base64 data URL, langsung set
    if (photoUrl.startsWith('data:image/')) {
        imgElement.src = photoUrl;
        imgElement.style.display = 'block';
        if (placeholderElement) placeholderElement.style.display = 'none';
        return;
    }
    
    // Get direct URL
    const directUrl = getDirectImageUrl(photoUrl);
    
    if (!directUrl) {
        imgElement.style.display = 'none';
        if (placeholderElement) placeholderElement.style.display = 'flex';
        return;
    }
    
    // Set dengan onerror handler yang akan coba proxy
    imgElement.onload = function() {
        imgElement.style.display = 'block';
        if (placeholderElement) placeholderElement.style.display = 'none';
    };
    
    imgElement.onerror = async function() {
        console.warn('⚠️ Direct URL failed, trying proxy...');
        // Try proxy on error
        await tryProxyImage(imgElement, placeholderElement, photoUrl, photoUrl.substring(0, 100));
    };
    
    imgElement.src = directUrl;
}

/**
 * Generate HTML untuk photo cell di tabel
 * DEPRECATED: Now delegates to generateSmartPhotoHtml() for better fallback support
 * Kept for backward compatibility
 */
function generatePhotoCell(linkFoto, nama = '', size = 'small') {
    // Delegate to new smart photo system with multi-fallback support
    return generateSmartPhotoHtml(linkFoto, nama || 'Foto', size);
}

/**
 * Initialize async photo loading untuk semua gambar dalam container
 * Fungsi ini dipanggil setelah render tabel untuk memastikan semua foto
 * dimuat dengan fallback mechanism yang lengkap
 */
function initAsyncPhotos(container) {
    if (!container) return;
    
    // Cari semua img elements dalam container
    const images = container.querySelectorAll('img[data-photo-url]');
    
    images.forEach(img => {
        const photoUrl = img.getAttribute('data-photo-url');
        if (photoUrl && photoUrl.length > 10) {
            // Find parent placeholder
            const placeholder = img.parentElement.querySelector('.photo-placeholder-small, .table-photo-placeholder, [class*="placeholder"]');
            
            // Apply async loading with fallback
            setPhotoWithFallback(img, placeholder, photoUrl);
        }
    });
}

/**
 * Alternative: Enhanced img onerror handler yang coba multiple URLs
 * Digunakan sebagai inline handler pada gambar di tabel
 */
window.handleImageError = function(img, originalUrl) {
    console.warn('⚠️ Image failed to load, trying fallback...');
    
    // Coba alternative URLs
    const fileId = extractFileId(originalUrl);
    if (fileId) {
        const altUrls = generateDirectUrls(fileId);
        
        // Try each URL sequentially
        let attempt = 0;
        const tryNext = () => {
            if (attempt >= altUrls.length) {
                // Semua gagal, coba proxy
                tryProxyImage(img, null, originalUrl, originalUrl.substring(0, 100));
                return;
            }
            
            const testImg = new Image();
            testImg.onload = () => {
                if (testImg.naturalWidth > 10) {
                    img.src = altUrls[attempt];
                    console.log(`✅ Image loaded via fallback ${attempt}`);
                } else {
                    attempt++;
                    tryNext();
                }
            };
            testImg.onerror = () => {
                attempt++;
                tryNext();
            };
            testImg.src = altUrls[attempt];
        };
        
        tryNext();
    } else {
        // Tidak bisa extract ID, tampilkan placeholder
        if (img.parentElement) {
            img.parentElement.innerHTML = '<span class="photo-placeholder-small">👤</span>';
        }
    }
};

// ===== API FETCH HELPER (Supabase) - DEPRECATED =====
// This function is deprecated. Use Supabase client functions directly.
// Kept for backward compatibility only.

// ===== DASHBOARD v3.0 FUNCTIONS =====

/**
 * Render Dashboard - Fetch data dari Supabase
 */
async function renderDashboard() {
    console.log('🔄 Loading Dashboard v3.0...');
    
    // Track visitor saat dashboard dibuka (non-critical)
    trackVisitorSimple().catch(() => {});  // Fire and forget - tidak menunggu
    
    // Fetch semua data secara paralel dengan individual error handling
    const results = await Promise.allSettled([
        fetchDashboardStats(),
        fetchRecentSubmissions(),
        fetchVisitorStats()
    ]);
    
    // Log hasil (tanpa menghentukan dashboard)
    results.forEach((result, index) => {
        const names = ['fetchDashboardStats', 'fetchRecentSubmissions', 'fetchVisitorStats'];
        if (result.status === 'rejected') {
            console.warn(`⚠️ ${names[index]} failed:`, result.reason);
        }
    });
    
    // 🆕 Inisialisasi Real-time Visitor Stats System (setelah data pertama load)
    if (typeof initVisitorRealtimeSystem === 'function') {
        // Delay sedikit untuk memastikan DOM siap
        setTimeout(() => {
            initVisitorRealtimeSystem();
        }, 1000);
    }
    
    // Update timestamp
    updateLastUpdateTime();
}

/**
 * Refresh Dashboard (manual)
 */
async function refreshDashboard() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '⏳ Loading...';
    
    // Fetch semua data secara paralel dengan individual error handling
    await Promise.allSettled([
        fetchDashboardStats(),
        fetchRecentSubmissions(),
        fetchPenetapanStats()  // NEW: Fetch data penetapan & akademik
    ]);
    
    updateLastUpdateTime();
    
    btn.disabled = false;
    btn.innerHTML = '🔄 Refresh';
    showToast('✅ Dashboard berhasil di-refresh!', 'success');
}

/**
 * Update timestamp terakhir update
 */
function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('last-update-time').textContent = `Terakhir update: ${timeStr}`;
}

/**
 * Fetch statistik dashboard dari Supabase
 * Menggunakan Supabase client
 */
/**
 * Fetch statistik dashboard dari Supabase
 */
/**
 * Fetch statistik dashboard dari Supabase (OPTIMIZED v2.0)
 * - Query paralel dengan Promise.all untuk performa lebih baik
 * - Timeout handling 10 detik per query
 * - Status konsisten dengan schema Supabase
 */
async function fetchDashboardStats() {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase client tidak tersedia');
            loadDummyStats();
            return;
        }
        
        // Timeout helper function (10 detik)
        const withTimeout = (promise, ms) => Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), ms))
        ]);
        
        // Jalankan semua query SECARA PARALEL (bukan berurutan)
        const [
            totalResult,
            disetujuiResult,
            ditolakResult,
            perbaikanResult,
            batalResult,
            prosesResult
        ] = await Promise.allSettled([
            withTimeout(
                supabaseClient.from('submissions').select('*', { count: 'exact', head: true }),
                10000
            ),
            withTimeout(
                supabaseClient.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'Disetujui'),
                10000
            ),
            withTimeout(
                supabaseClient.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'Ditolak'),
                10000
            ),
            withTimeout(
                supabaseClient.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'Perbaikan'),
                10000
            ),
            withTimeout(
                supabaseClient.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'Dibatalkan'),
                10000
            ),
            withTimeout(
                supabaseClient.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'Proses Verifikasi'),
                10000
            )
        ]);
        
        // Ekstrak hasil dengan fallback ke 0 jika error
        const total = totalResult.status === 'fulfilled' ? (totalResult.value.count || 0) : 0;
        const disetujui = disetujuiResult.status === 'fulfilled' ? (disetujuiResult.value.count || 0) : 0;
        const ditolak = ditolakResult.status === 'fulfilled' ? (ditolakResult.value.count || 0) : 0;
        const perbaikan = perbaikanResult.status === 'fulfilled' ? (perbaikanResult.value.count || 0) : 0;
        const batal = batalResult.status === 'fulfilled' ? (batalResult.value.count || 0) : 0;
        
        // Update card values dengan animasi
        animateValue('stat-total', total);
        animateValue('stat-disetujui', disetujui);
        animateValue('stat-ditolak', ditolak);
        animateValue('stat-perbaikan', perbaikan);
        animateValue('stat-batal', batal);
        
        console.log('✅ Dashboard stats loaded:', { 
            total, disetujui, ditolak, perbaikan, batal,
            loadTime: 'parallel queries'
        });
    } catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        loadDummyStats();
    }
}

/**
 * Load dummy stats untuk development/demo
 */
function loadDummyStats() {
    // Update dengan null safety
    const safeUpdate = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    safeUpdate('stat-total', '0');
    safeUpdate('stat-disetujui', '0');
    safeUpdate('stat-ditolak', '0');
    safeUpdate('stat-perbaikan', '0');
    safeUpdate('stat-batal', '0');
    
    // NEW: Dummy stats for new cards
    document.getElementById('stat-lulus-pt').textContent = '0';
    document.getElementById('stat-penerima-beasiswa').textContent = '0';
    document.getElementById('stat-jurusan-terbanyak').textContent = '0';
    document.getElementById('stat-unit-terbanyak').textContent = '0';
    document.getElementById('jurusan-terbanyak-nama').textContent = '-';
    document.getElementById('unit-terbanyak-nama').textContent = '-';
}

/**
 * Animasi angka saat value berubah
 */
function animateValue(elementId, endValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuart);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Fetch 5 data terbaru dari Supabase [WITH PAGINATION]
 * Menggunakan Supabase client
 */
// Variable already declared at top to avoid TDZ error

async function fetchRecentSubmissions() {
    const tbody = document.getElementById('recent-submissions-body');
    
    try {
        // Using Supabase client - get data directly
        const data = await getRecentSubmissionsFromSupabase();
        
        if (data && data.length > 0) {
            // Cache all data for pagination
            cachedRecentSubmissions = data;
            renderRecentSubmissions();
            
            console.log(`✅ Loaded ${data.length} recent submissions`);
        } else {
            cachedRecentSubmissions = [];
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="loading-cell">
                        📭 Belum ada data pengajuan
                    </td>
                </tr>
            `;
            // Hide pagination when no data
            document.getElementById('pagination-recent-submissions-container').innerHTML = '';
        }
    } catch (error) {
        console.error('❌ Error fetching recent submissions:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-cell">
                    ⚠️ Gagal memuat data. Pastikan koneksi Supabase sudah benar.
                </td>
            </tr>
        `;
    }
}

/**
 * Render Recent Submissions with Pagination
 * Maps Supabase snake_case fields to table display
 */
function renderRecentSubmissions() {
    const tbody = document.getElementById('recent-submissions-body');
    const container = document.getElementById('pagination-recent-submissions-container');
    
    if (!cachedRecentSubmissions || cachedRecentSubmissions.length === 0) {
        return;
    }
    
    // Use PaginationManager to get paginated data
    const paginatedResult = PaginationManager.paginate('recent-submissions', cachedRecentSubmissions);
    
    tbody.innerHTML = paginatedResult.data.map((item, index) => {
        const rowNum = (paginatedResult.pageInfo.currentPage - 1) * 10 + index + 1;
        
        // Map Supabase snake_case fields to display
        // Supabase returns: nama_lengkap, jurusan_tujuan, jenjang_pendidikan, unit_tujuan, link_foto
        const namaLengkap = item.nama_lengkap || item.namaLengkap || '-';
        const jurusanTujuan = item.jurusan_tujuan || item.jurusanTujuan || '-';
        const jenjangPendidikan = item.jenjang_pendidikan || item.jenjangPendidikan || '-';
        const unitTujuan = item.unit_tujuan || item.unitTujuan || '-';
        const linkFoto = item.link_foto || item.linkFoto || item.foto || '';
        const status = item.status || 'Pending';
        
        // Use generatePhotoCell for consistent image handling with fallback
        const photoHtml = generatePhotoCell(linkFoto, namaLengkap, 'small');
        
        return `
            <tr data-row-number="${rowNum}" data-id="${item.id || ''}">
                <td>${photoHtml}</td>
                <td><strong>${namaLengkap}</strong></td>
                <td>${jurusanTujuan}</td>
                <td>${jenjangPendidikan}</td>
                <td>${unitTujuan}</td>
                <td>${getStatusBadge(status)}</td>
            </tr>
        `;
    }).join('');
    
    // Initialize async photo loading for all images in this table
    initAsyncPhotos(tbody);
    
    // Render pagination controls
    container.innerHTML = PaginationManager.renderControls('recent-submissions');
}

/**
 * Tampilkan detail data berdasarkan status (popup modal) [WITH PAGINATION]
 */
// Variable already declared at top to avoid TDZ error

async function showStatusDetail(statusFilter) {
    const modal = document.getElementById('status-detail-modal');
    const titleEl = document.getElementById('status-modal-title');
    const countEl = document.getElementById('modal-status-count');
    const nameEl = document.getElementById('modal-status-name');
    const tbody = document.getElementById('status-detail-body');
    
    // Map UI status filters to actual Supabase status values
    const statusMapping = {
        'total': null, // null means no filter (all)
        'disetujui': 'Diterima',
        'ditolak': 'Ditolak',
        'perbaikan': 'Revisi',
        'batal': 'Dibatalkan'
    };
    
    // Set title dan status name berdasarkan filter
    const statusConfig = {
        'total': { title: '📊 Semua Data Pengajuan', name: 'Semua Status' },
        'disetujui': { title: '✅ Data Disetujui', name: 'Disetujui' },
        'ditolak': { title: '❌ Data Ditolak', name: 'Ditolak' },
        'perbaikan': { title: '⚠️ Data Perlu Perbaikan', name: 'Perbaikan' },
        'batal': { title: '🚫 Data Dibatalkan', name: 'Batal' }
    };
    
    const config = statusConfig[statusFilter] || statusConfig['total'];
    titleEl.textContent = config.title;
    nameEl.textContent = config.name;
    
    // Show modal dengan loading state
    modal.classList.add('active');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="loading-cell">
                <div class="spinner"></div>
                Memuat detail data...
            </td>
        </tr>
    `;
    
    // Reset pagination when opening new status
    PaginationManager.reset('status-detail');
    
    try {
        // Map UI filter to Supabase status value
        const supabaseStatus = statusMapping[statusFilter];
        
        // Using Supabase client with correct status value
        const result = await fetchDataByStatus(supabaseStatus);
        
        if (result.status === 'success') {
            countEl.textContent = result.total || result.count || 0;
            
            // Cache data for pagination
            cachedStatusDetail = result.data || [];
            
            // Render with pagination
            renderStatusDetailPaginated();
        } else {
            throw new Error(result.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Error fetching status detail:', error);
        countEl.textContent = '0';
        cachedStatusDetail = [];
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-cell">
                    ⚠️ Gagal memuat data: ${error.message}
                </td>
            </tr>
        `;
        document.getElementById('pagination-status-detail-container').innerHTML = '';
    }
}

/**
 * Render Status Detail with Pagination
 * Maps Supabase snake_case fields to table display
 */
function renderStatusDetailPaginated() {
    const tbody = document.getElementById('status-detail-body');
    const container = document.getElementById('pagination-status-detail-container');
    
    if (!cachedStatusDetail || cachedStatusDetail.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-cell">
                    📭 Tidak ada data dengan status ini
                </td>
            </tr>
        `;
        container.innerHTML = '';
        return;
    }
    
    // Use PaginationManager
    const paginatedResult = PaginationManager.paginate('status-detail', cachedStatusDetail);
    
    tbody.innerHTML = paginatedResult.data.map((item, index) => {
        const rowNum = (paginatedResult.pageInfo.currentPage - 1) * 10 + index + 1;
        
        // Map Supabase snake_case fields to display
        const namaLengkap = item.nama_lengkap || item.namaLengkap || '-';
        const jurusanTujuan = item.jurusan_tujuan || item.jurusanTujuan || '-';
        const jenjangPendidikan = item.jenjang_pendidikan || item.jenjangPendidikan || '-';
        const unitTujuan = item.unit_tujuan || item.unitTujuan || '-';
        const rencanaTahunStudi = item.rencana_tahun_studi || item.rencanaTahunStudi || item.tahun_studi || '-';
        
        return `
            <tr data-id="${item.id || ''}">
                <td>${rowNum}</td>
                <td><strong>${namaLengkap}</strong></td>
                <td>${jurusanTujuan}</td>
                <td>${jenjangPendidikan}</td>
                <td>${unitTujuan}</td>
                <td>${rencanaTahunStudi}</td>
            </tr>
        `;
    }).join('');
    
    // Render pagination controls
    container.innerHTML = PaginationManager.renderControls('status-detail');
}

/**
 * Track visitor ke Supabase (opsional - non-critical)
 * VERSI ENHANCED: Mengisi SEMUA kolom dengan data lengkap
 * 
 * Kolom yang diisi:
 * - user_agent ✅
 * - page ✅
 * - referrer ✅
 * - language ✅
 * - screen_resolution ✅
 * - ip_address ✅ (jika bisa didapat)
 * - country ✅ (dari language/timezone)
 * - city ✅ (default Unknown)
 * - visited_at ✅
 */
async function trackVisitorSimple() {
    try {
        // ==========================================
        // DETEKSI PERANGKAT & BROWSER (LENGKAP)
        // ==========================================
        const ua = navigator.userAgent;
        
        // Deteksi Browser
        let browser = 'Unknown';
        let browserVersion = '';
        
        if (ua.includes('Firefox/')) {
            browser = 'Firefox';
            browserVersion = ua.split('Firefox/')[1]?.split(' ')[0] || '';
        } else if (ua.includes('Edg/')) {
            browser = 'Edge';
            browserVersion = ua.split('Edg/')[1]?.split(' ')[0] || '';
        } else if (ua.includes('Chrome/')) {
            browser = 'Chrome';
            browserVersion = ua.split('Chrome/')[1]?.split(' ')[0] || '';
        } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
            browser = 'Safari';
            browserVersion = ua.split('Version/')[1]?.split(' ')[0] || '';
        } else if (ua.includes('Opera') || ua.includes('OPR/')) {
            browser = 'Opera';
            browserVersion = ua.split('OPR/')[1]?.split(' ')[0] || ua.split('Version/')[1]?.split(' ')[0] || '';
        }
        
        // Deteksi OS
        let os = 'Unknown';
        if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
        else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
        else if (ua.includes('Windows NT 6.2')) os = 'Windows 8';
        else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
        else if (ua.includes('Mac OS X')) {
            const macVersion = ua.match(/Mac OS X (\d+[._]\d+)/);
            os = 'macOS ' + (macVersion ? macVersion[1].replace('_', '.') : '');
        }
        else if (ua.includes('Android')) {
            const androidVersion = ua.match(/Android (\d+\.?\d*)/);
            os = 'Android ' + (androidVersion ? androidVersion[1] : '');
        }
        else if (ua.includes('iOS') || ua.includes('iPhone OS')) {
            const iosVersion = ua.match(/OS (\d+_?\d*)/);
            os = 'iOS ' + (iosVersion ? iosVersion[1].replace('_', '.') : '');
        }
        else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
        
        // Deteksi Device Type
        let deviceType = 'Desktop';
        if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
            deviceType = /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Mobile';
        }
        
        // Deteksi Screen Info
        const screenWidth = screen.width;
        const screenHeight = screen.height;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const pixelRatio = window.devicePixelRatio || 1;
        const colorDepth = screen.colorDepth;
        const orientation = screen.orientation?.type || (windowWidth > windowHeight ? 'landscape' : 'portrait');
        
        // ==========================================
        // DETEKSI LOKASI (dari language/timezone)
        // ==========================================
        const language = navigator.language || navigator.userLanguage || 'id-ID';
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
        
        // Extract country dari language atau timezone
        let country = 'Unknown';
        let city = 'Unknown';
        
        // Dari language code (en-US → US)
        if (language && language.includes('-')) {
            country = language.split('-')[1].toUpperCase();
        } else if (language) {
            country = language.toUpperCase();
        }
        
        // Mapping timezone ke negara (simplified)
        const timezoneCountryMap = {
            'Asia/Jakarta': 'Indonesia',
            'Asia/Makassar': 'Indonesia',
            'Asia/Jayapura': 'Indonesia',
            'Asia/Singapore': 'Singapore',
            'Asia/Kuala_Lumpur': 'Malaysia',
            'Asia/Manila': 'Philippines',
            'Asia/Bangkok': 'Thailand',
            'Asia/Ho_Chi_Minh': 'Vietnam',
            'Asia/Yangon': 'Myanmar',
            'Asia/Rangoon': 'Myanmar',
            'Asia/Phnom_Penh': 'Cambodia',
            'Asia/Vientiane': 'Laos',
            'Asia/Bandar_Seri_Begawan': 'Brunei',
            'Asia/Dili': 'Timor-Leste',
            'Australia/Sydney': 'Australia',
            'America/New_York': 'United States',
            'America/Los_Angeles': 'United States',
            'America/Chicago': 'United States',
            'Europe/London': 'United Kingdom',
            'Europe/Paris': 'France',
            'Europe/Berlin': 'Germany',
            'Europe/Madrid': 'Spain',
            'Europe/Rome': 'Italy',
            'Europe/Amsterdam': 'Netherlands',
            'Asia/Tokyo': 'Japan',
            'Asia/Seoul': 'South Korea',
            'Asia/Shanghai': 'China',
            'Asia/Hong_Kong': 'Hong Kong',
            'Asia/Taipei': 'Taiwan'
        };
        
        if (timezoneCountryMap[timezone]) {
            country = timezoneCountryMap[timezone];
        }
        
        // City estimation (very basic)
        if (timezone === 'Asia/Jakarta') city = 'Jakarta (est.)';
        else if (timezone === 'Asia/Makassar') city = 'Makassar (est.)';
        else if (timezone === 'Asia/Jayapura') city = 'Jayapura (est.)';
        else city = 'Unknown';
        
        // ==========================================
        // KOMPILASI DATA VISITOR (LENGKAP!)
        // ==========================================
        const visitorData = {
            // Data dasar (wajib)
            user_agent: `${browser} ${browserVersion} (${os}) [${deviceType}]`,
            page: window.location.pathname + window.location.search,
            referrer: document.referrer || 'direct',
            language: language,
            
            // Device & Screen info
            screen_resolution: `${screenWidth}x${screenHeight}`,
            
            // Lokasi (estimated)
            ip_address: '-',  // IP tidak bisa didapat client-side tanpa API eksternal
            country: country,
            city: city,
            
            // Timestamp
            visited_at: new Date().toISOString(),
            
            // Metadata tambahan (untuk analisis)
            _meta: JSON.stringify({
                browser: browser,
                browserVersion: browserVersion,
                os: os,
                deviceType: deviceType,
                screenWidth,
                screenHeight,
                windowWidth,
                windowHeight,
                pixelRatio,
                colorDepth,
                orientation,
                timezone,
                platform: navigator.platform,
                cookiesEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack,
                connection: navigator.connection?.effectiveType || 'unknown'
            })
        };
        
        console.log('[VISITOR] 📊 Tracking data:', {
            browser: `${browser} ${browserVersion}`,
            os,
            deviceType,
            resolution: `${screenWidth}x${screenHeight}`,
            location: `${city}, ${country}`
        });
        
        // Simpan ke Supabase (jika tabel visitors ada dan RLS mengizinkan)
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { error } = await supabaseClient
                .from('visitors')
                .insert([visitorData]);
            
            if (error) {
                console.warn('[VISITOR] ⚠️ Tracking skipped:', error.message, error.code);
                
                // Coba insert tanpa field _meta jika error (kolom mungkin tidak ada)
                if (error.code === '42703' || error.message?.includes('_meta')) {
                    console.log('[VISITOR] 🔄 Retrying without _meta field...');
                    const { error: retryError } = await supabaseClient
                        .from('visitors')
                        .insert([{
                            user_agent: visitorData.user_agent,
                            page: visitorData.page,
                            referrer: visitorData.referrer,
                            language: visitorData.language,
                            screen_resolution: visitorData.screen_resolution,
                            ip_address: visitorData.ip_address,
                            country: visitorData.country,
                            city: visitorData.city,
                            visited_at: visitorData.visited_at
                        }]);
                    
                    if (retryError) {
                        console.warn('[VISITOR] ❌ Retry also failed:', retryError.message);
                    } else {
                        console.log('[VISITOR] ✅ Tracked successfully (without metadata)');
                    }
                }
            } else {
                console.log('[VISITOR] ✅ Visitor tracked successfully');
            }
        } else {
            console.log('[VISITOR] ℹ️ Supabase client not available');
        }
    } catch (error) {
        // Silent fail - visitor tracking tidak kritis
        console.log('[VISITOR] ⚠️ Tracking skipped:', error.message);
    }
}

/**
 * Extract browser name from user agent string (ENHANCED VERSION)
 */
function extractBrowserName(userAgent) {
    if (!userAgent) return 'Unknown';
    
    // Prioritas tinggi → rendah
    if (userAgent.includes('Edg/')) return '🌐 Edge';
    if (userAgent.includes('OPR/')) return '🎭 Opera';
    if (userAgent.includes('Firefox/')) return '🦊 Firefox';
    if (userAgent.includes('Chrome/')) return '⭕ Chrome';
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) return '🧭 Safari';
    
    // Mobile browsers
    if (userAgent.includes('SamsungBrowser')) return '📱 Samsung Browser';
    if (userAgent.includes('UCBrowser')) return '📱 UC Browser';
    
    return '🌐 Browser';
}

/**
 * Fetch statistik pengunjung dari Google Sheets
 * Menggunakan Supabase client
 */
async function fetchVisitorStats() {
    try {
        // Using Supabase client
        const result = await getVisitorStats();
        
        if (result.status === 'success') {
            const data = result.data;
            
            // Update stat cards (dengan null safety)
            const visitorTotal = document.getElementById('visitor-total');
            const visitorToday = document.getElementById('visitor-today');
            const visitorOnline = document.getElementById('visitor-online');
            const visitorCountries = document.getElementById('visitor-countries');
            
            if (visitorTotal) visitorTotal.textContent = data.totalKunjungan || 0;
            if (visitorToday) visitorToday.textContent = data.hariIni || 0;
            if (visitorOnline) visitorOnline.textContent = data.onlineEstimate || 0;
            if (visitorCountries) visitorCountries.textContent = Object.keys(data.negara || {}).length;
            
            // Render chart jika ada data
            if (data.dataPerHari && data.dataPerHari.length > 0) {
                renderVisitorChart(data.dataPerHari);
            }
            
            // Render recent visitors table
            renderRecentVisitorsTable(data.kunjunganTerakhir || []);
            
            console.log('✅ Visitor stats loaded:', data);
        }
    } catch (error) {
        console.error('❌ Error fetching visitor stats:', error);
        // Set default values (dengan null safety)
        const vTotal = document.getElementById('visitor-total');
        const vToday = document.getElementById('visitor-today');
        const vOnline = document.getElementById('visitor-online');
        const vCountries = document.getElementById('visitor-countries');
        
        if (vTotal) vTotal.textContent = '0';
        if (vToday) vToday.textContent = '0';
        if (vOnline) vOnline.textContent = '0';
        if (vCountries) vCountries.textContent = '0';
    }
}

