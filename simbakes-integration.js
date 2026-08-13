/**
 * =====================================================
 * SIMBAKES - Integration Layer (Template Connector)
 * =====================================================
 * 
 * File ini menghubungkan template HTML dengan Supabase
 * TIDAK MENGUBAH STRUKTUR TEMPLATE - hanya override fungsi data
 * 
 * CARA PENGGUNAAN:
 * 1. Letakkan file ini di folder yang sama dengan index.html
 * 2. Tambahkan <script src="simbakes-integration.js"></script> SEBELUM </body>
 * 3. Pastikan supabase-client.js sudah dimuat sebelumnya
 */

// =====================================================
// CONFIGURATION CHECKER
// =====================================================
function checkSupabaseConfig() {
    if (typeof SUPABASE_CONFIG === 'undefined') {
        console.error('[SIMBAKES] SUPABASE_CONFIG tidak ditemukan! Pastikan supabase-client.js sudah dimuat');
        return false;
    }
    
    if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' || !SUPABASE_CONFIG.url) {
        console.warn('[SIMBAKES] ⚠️ Supabase URL belum dikonfigurasi');
        showNotification('Konfigurasi Supabase belum lengkap! Edit file supabase-client.js', 'error');
        return false;
    }
    
    if (SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY' || !SUPABASE_CONFIG.anonKey) {
        console.warn('[SIMBAKES] ⚠️ Supabase Anon Key belum dikonfigurasi');
        showNotification('Konfigurasi Supabase belum lengkap! Edit file supabase-client.js', 'error');
        return false;
    }
    
    return true;
}

// =====================================================
// AUTHENTICATION INTEGRATION
// =====================================================

/**
 * Override login function untuk menggunakan Supabase
 */
async function handleLoginSupabase(username, password) {
    if (!checkSupabaseConfig()) {
        // Fallback ke demo mode jika Supabase belum dikonfigurasi
        console.log('[SIMBAKES] Using fallback authentication');
        return handleLoginFallback(username, password);
    }

    try {
        showLoading(true);
        
        const result = await simbakesDB.login(username, password);
        
        if (result.success) {
            const user = result.user;
            
            // Set user session variables (sesuai template)
            currentUser = {
                id: user.id,
                nama: user.nama_lengkap,
                username: user.username,
                role: user.role,
                email: user.email
            };
            
            // Simpan ke sessionStorage untuk digunakan template
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            sessionStorage.setItem('isLoggedIn', 'true');
            
            console.log('[SIMBAKES] Login berhasil:', currentUser.nama, '(' + currentUser.role + ')');
            
            // Redirect sesuai role (mengikuti logika template)
            setTimeout(() => {
                hideLandingPage();
                showDashboard();
                showNotification('Selamat datang, ' + currentUser.nama + '!', 'success');
            }, 500);
            
            return { success: true };
        } else {
            showNotification(result.error || 'Login gagal', 'error');
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('[SIMBAKES] Login error:', error);
        showNotification('Terjadi kesalahan saat login', 'error');
        return { success: false, error: error.message };
    } finally {
        showLoading(false);
    }
}

/**
 * Fallback authentication jika Supabase belum siap
 */
function handleLoginFallback(username, password) {
    // Demo credentials dari Excel multiusers
    const demoUsers = [
        { username: 'superadmin', password: 'Aida2007###', nama: 'Mukmin Nasri', role: 'superadmin' },
        { username: 'operator2', password: 'EtaSDMK2024@', nama: 'Eta', role: 'admin' },
        { username: 'admin', password: 'admin123', nama: 'Administrator', role: 'admin' },
        { username: 'operator', password: 'operator123', nama: 'Operator', role: 'operator' }
    ];
    
    const user = demoUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = {
            id: 'demo-' + user.username,
            nama: user.nama,
            username: user.username,
            role: user.role,
            email: user.email || user.username + '@simbakes.local'
        };
        
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        sessionStorage.setItem('isLoggedIn', 'true');
        
        setTimeout(() => {
            hideLandingPage();
            showDashboard();
            showNotification('Mode Demo - Selamat datang, ' + currentUser.nama + '!', 'warning');
        }, 300);
        
        return { success: true };
    } else {
        showNotification('Username atau password salah!', 'error');
        return { success: false };
    }
}

/**
 * Override logout function
 */
function handleLogoutSupabase() {
    simbakesDB.logout().then(() => {
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('isLoggedIn');
        currentUser = null;
        
        showLandingPage();
        showNotification('Berhasil logout', 'success');
    });
}

// =====================================================
// DATA PENGUSULAN INTEGRATION
// =====================================================

/**
 * Load data pengusulan dari Supabase
 * Menggantikan fungsi loadMockData() di template
 */
async function loadDataPengusulan(filters = {}) {
    if (!checkSupabaseConfig()) {
        return loadPengusulanFallback(filters);
    }

    try {
        showLoading(true);
        
        const result = await simbakesDB.getPengusulan(filters);
        
        if (result.success) {
            console.log(`[SIMBAKES] Loaded ${result.data.length} pengusulan records`);
            
            // Format data sesuai struktur yang diharapkan template
            const formattedData = result.data.map(item => ({
                id: item.id,
                nik: item.nik,
                nama: item.nama_lengkap,
                tempatLahir: item.tempat_lahir,
                tanggalLahir: formatTanggal(item.tanggal_lahir),
                alamatKTP: item.alamat_ktp,
                alamatDomisili: item.alamat_domisili,
                lamaDomisili: item.lama_domisili_tahun,
                pekerjaan: item.pekerjaan,
                posisi: item.posisi_jabatan,
                unitKerja: item.unit_kerja,
                narasi: item.penjelasan_narasi,
                jurusan: item.jurusan_tujuan,
                jenjang: item.jenjang_pendidikan,
                unitTujuan: item.unit_tujuan_pemanfaatan,
                tahunStudi: item.rencana_tahun_studi,
                noHP: item.no_hp,
                whatsapp: item.no_whatsapp,
                email: item.email,
                status: item.status,
                pasfoto: item.pasfoto,
                dokumen: item.dokumen,
                createdAt: formatTanggal(item.created_at)
            }));
            
            return {
                success: true,
                data: formattedData,
                total: result.total
            };
        } else {
            console.error('[SIMBAKES] Error loading pengusulan:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('[SIMBAKES] Exception loading pengusulan:', error);
        return { success: false, error: error.message };
    } finally {
        showLoading(false);
    }
}

/**
 * Insert new pengusulan ke Supabase
 */
async function insertPengusulanSupabase(formData) {
    if (!checkSupabaseConfig()) {
        showNotification('Tidak dapat menyimpan - Supabase belum dikonfigurasi', 'error');
        return { success: false };
    }

    try {
        showLoading(true);

        // Map form data ke database schema
        const dbData = {
            nik: formData.nik,
            nama_lengkap: formData.namaLengkap || formData.nama_lengkap,
            tempat_lahir: formData.tempatLahir || formData.tempat_lahir,
            tanggal_lahir: parseDate(formData.tanggalLahir || formData.tanggal_lahir),
            alamat_ktp: formData.alamatKTP || formData.alamat_ktp,
            alamat_domisili: formData.alamatDomisili || formData.alamat_domisili,
            lama_domisili_tahun: parseInt(formData.lamaDomisili) || null,
            pekerjaan: formData.pekerjaan,
            posisi_jabatan: formData.posisi || formData.posisi_jabatan,
            unit_kerja: formData.unitKerja || formData.unit_kerja,
            penjelasan_narasi: formData.narasi || formData.penjelasan_narasi,
            jurusan_tujuan: formData.jurusan || formData.jurusan_tujuan,
            jenjang_pendidikan: formData.jenjang || formData.jenjang_pendidikan,
            unit_tujuan_pemanfaatan: formData.unitTujuan || formData.unit_tujuan_pemanfaatan,
            rencana_tahun_studi: parseInt(formData.tahunStudi) || null,
            no_hp: formData.noHP || formData.no_hp,
            no_whatsapp: formData.whatsapp || formData.no_whatsapp,
            email: formData.email,
            status: formData.status || 'diajukan',
            pasfoto: formData.pasfoto,
            dokumen: formData.dokumen
        };

        const result = await simbakesDB.insertPengusulan(dbData);

        if (result.success) {
            showNotification('Data pengusulan berhasil disimpan!', 'success');
            return result;
        } else {
            showNotification('Gagal menyimpan: ' + result.error, 'error');
            return result;
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
        return { success: false, error: error.message };
    } finally {
        showLoading(false);
    }
}

/**
 * Update existing pengusulan
 */
async function updatePengusulanSupabase(nik, updateData) {
    if (!checkSupabaseConfig()) {
        showNotification('Tidak dapat mengupdate - Supabase belum dikonfigurasi', 'error');
        return { success: false };
    }

    try {
        showLoading(true);

        const result = await simbakesDB.updatePengusulan(nik, updateData);

        if (result.success) {
            showNotification('Data berhasil diupdate!', 'success');
        } else {
            showNotification('Gagal update: ' + result.error, 'error');
        }

        return result;
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
        return { success: false, error: error.message };
    } finally {
        showLoading(false);
    }
}

// =====================================================
// DATA PENETAPAN INTEGRATION
// =====================================================

/**
 * Load data penetapan dari Supabase
 */
async function loadDataPenetapan(filters = {}) {
    if (!checkSupabaseConfig()) {
        return loadPenetapanFallback(filters);
    }

    try {
        showLoading(true);
        
        const result = await simbakesDB.getPenetapan(filters);
        
        if (result.success) {
            const formattedData = result.data.map(item => ({
                id: item.id,
                nik: item.nik,
                nama: item.nama_lengkap,
                jurusan: item.jurusan_tujuan,
                jenjang: item.jenjang_pendidikan,
                unitTujuan: item.unit_tujuan_pemanfaatan,
                tahunStudi: item.rencana_tahun_studi,
                noSK: item.no_sk_penetapan,
                tanggalPenetapan: formatTanggal(item.tanggal_penetapan),
                status: item.status_penetapan,
                catatan: item.catatan_penetapan,
                fotoPasfoto: item.link_foto_pasfoto,
                dokumenPDF: item.link_dokumen_pdf,
                periode: item.periode_pemberian
            }));
            
            return { success: true, data: formattedData, total: result.total };
        }
        
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        showLoading(false);
    }
}

/**
 * Insert/update penetapan
 */
async function savePenetapanSupabase(penetapanData) {
    if (!checkSupabaseConfig()) {
        showNotification('Supabase belum dikonfigurasi', 'error');
        return { success: false };
    }

    try {
        showLoading(true);

        const dbData = {
            nik: penetapanData.nik,
            nama_lengkap: penetapanData.nama || penetapanData.nama_lengkap,
            jurusan_tujuan: penetapanData.jurusan || penetapanData.jurusan_tujuan,
            jenjang_pendidikan: penetapanData.jenjang || penetapanData.jenjang_pendidikan,
            unit_tujuan_pemanfaatan: penetapanData.unitTujuan || penetapanData.unit_tujuan_pemanfaatan,
            rencana_tahun_studi: parseInt(penetapanData.tahunStudi),
            no_sk_penetapan: penetapanData.noSK || penetapanData.no_sk_penetapan,
            tanggal_penetapan: parseDate(penetapanData.tanggalPenetapan || penetapanData.tanggal_penetapan),
            status_penetapan: penetapanData.status || penetapanData.status_penetapan || 'pending',
            catatan_penetapan: penetapanData.catatan || penetapanData.catatan_penetapan,
            link_foto_pasfoto: penetapanData.fotoPasfoto || penetapanData.link_foto_pasfoto,
            link_dokumen_pdf: penetapanData.dokumenPDF || penetapanData.link_dokumen_pdf,
            periode_pemberian: penetapanData.periode || penetapanData.periode_pemberian
        };

        let result;
        if (penetapanData.id) {
            result = await simbakesDB.updatePenetapan(penetapanData.id, dbData);
        } else {
            result = await simbakesDB.insertPenetapan(dbData);
        }

        if (result.success) {
            showNotification('Data penetapan berhasil disimpan!', 'success');
        } else {
            showNotification('Gagal menyimpan: ' + result.error, 'error');
        }

        return result;
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
        return { success: false, error: error.message };
    } finally {
        showLoading(false);
    }
}

// =====================================================
// ROADMAP KEBUTUHAN INTEGRATION
// =====================================================

/**
 * Load roadmap data dari Supabase
 */
async function loadRoadmapSupabase(filters = {}) {
    if (!checkSupabaseConfig()) {
        return loadRoadmapFallback(filters);
    }

    try {
        const result = await simbakesDB.getRoadmap(filters);
        
        if (result.success) {
            const formattedData = result.data.map(item => ({
                id: item.id,
                kode: item.kode,
                jurusan: item.jurusan,
                kualifikasi: item.kualifikasi_awal,
                jenisPendidikan: item.jenis_pendidikan,
                perguruanTinggi: item.perguruan_tinggi,
                pekerjaan: item.pekerjaan,
                tahunMulai: item.tahun_mulai_studi,
                unitPendayaguna: item.unit_pendayaguna,
                status: item.status,
                penerima: item.nama_penerima
            }));
            
            return { success: true, data: formattedData, total: result.total };
        }
        
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Save roadmap entry
 */
async function saveRoadmapSupabase(roadmapData) {
    if (!checkSupabaseConfig()) {
        showNotification('Supabase belum dikonfigurasi', 'error');
        return { success: false };
    }

    try {
        showLoading(true);

        const dbData = {
            kode: roadmapData.kode,
            jurusan: roadmapData.jurusan,
            kualifikasi_awal: roadmapData.kualifikasi || roadmapData.kualifikasi_awal,
            jenis_pendidikan: roadmapData.jenisPendidikan || roadmapData.jenis_pendidikan,
            perguruan_tinggi: roadmapData.perguruanTinggi || roadmapData.perguruan_tinggi,
            pekerjaan: roadmapData.pekerjaan,
            tahun_mulai_studi: parseInt(roadmapData.tahunMulai),
            unit_pendayaguna: roadmapData.unitPendayaguna || roadmapData.unit_pendayaguna,
            status: roadmapData.status || 'aktif',
            nama_penerima: roadmapData.penerima || roadmapData.nama_penerima
        };

        let result;
        if (roadmapData.id) {
            result = await simbakesDB.updateRoadmap(roadmapData.id, dbData);
        } else {
            result = await simbakesDB.insertRoadmap(dbData);
        }

        if (result.success) {
            showNotification('Data roadmap berhasil disimpan!', 'success');
        } else {
            showNotification('Gagal menyimpan: ' + result.error, 'error');
        }

        return result;
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
        return { success: false, error: error.message };
    } finally {
        showLoading(false);
    }
}

// =====================================================
// DASHBOARD STATISTICS INTEGRATION
// =====================================================

/**
 * Load dashboard statistics dari Supabase
 */
async function loadDashboardStats() {
    if (!checkSupabaseConfig()) {
        return getDashboardStatsFallback();
    }

    try {
        const result = await simbakesDB.getDashboardStats();
        
        if (result.success) {
            return {
                totalPengusulan: result.data.total_pengusulan || 0,
                pengusulanBaru: result.data.pengusulan_baru || 0,
                sedangDiproses: result.data.sedang_diproses || 0,
                totalDiterima: result.data.total_diterima || 0,
                totalDitolak: result.data.total_ditolak || 0,
                roadmapAktif: result.data.roadmap_aktif || 0
            };
        }
        
        return getDashboardStatsFallback();
    } catch (error) {
        console.error('[SIMBAKES] Dashboard stats error:', error);
        return getDashboardStatsFallback();
    }
}

function getDashboardStatsFallback() {
    return {
        totalPengusulan: 97,      // From Excel row count
        pengusulanBaru: 15,
        sedangDiproses: 32,
        totalDiterima: 18,       // From penetapan count
        totalDitolak: 5,
        roadmapAktif: 10
    };
}

// =====================================================
// EXPORT/IMPORT FUNCTIONS
// =====================================================

/**
 * Export data to Excel-compatible format
 */
async function exportToExcel(tableType, filters = {}) {
    if (!checkSupabaseConfig()) {
        showNotification('Export tidak tersedia - Supabase belum dikonfigurasi', 'error');
        return;
    }

    try {
        showLoading(true);
        
        let tableName;
        switch(tableType) {
            case 'pengusulan': tableName = 'data_pengusulan'; break;
            case 'penetapan': tableName = 'data_penetapan'; break;
            case 'roadmap': tableName = 'roadmap_kebutuhan'; break;
            default:
                throw new Error('Invalid table type');
        }

        const result = await simbakesDB.exportData(tableName, filters);
        
        if (result.success && result.data.length > 0) {
            // Convert to CSV for download
            const csv = convertToCSV(result.data);
            downloadFile(csv, `simbakes_${tableType}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
            showNotification(`Export berhasil: ${result.data.length} record`, 'success');
        } else {
            showNotification('Tidak ada data untuk diekspor', 'warning');
        }
    } catch (error) {
        showNotification('Export gagal: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Import data from Excel/CSV to Supabase
 */
async function importFromExcel(file, tableType) {
    if (!checkSupabaseConfig()) {
        showNotification('Import tidak tersedia - Supabase belum dikonfigurasi', 'error');
        return;
    }

    try {
        showLoading(true, 'Mengimpor data...');

        // Read file using FileReader
        const text = await readFileAsText(file);
        const data = parseCSV(text); // or use a proper Excel parser like SheetJS

        let result;
        switch(tableType) {
            case 'pengusulan':
                result = await simbakesDB.bulkInsertPengusulan(data);
                break;
            case 'penetapan':
                result = await simbakesDB.bulkInsertPenetapan(data);
                break;
            default:
                throw new Error('Unsupported table type for import');
        }

        if (result.success) {
            showNotification(`Import berhasil: ${result.count} record`, 'success');
        } else {
            showNotification('Import gagal: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Import error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function formatTanggal(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    } catch {
        return null;
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
        const values = headers.map(header => {
            const val = row[header];
            const str = val !== null && val !== undefined ? String(val) : '';
            return `"${str.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (const char of lines[i]) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        const obj = {};
        headers.forEach((header, idx) => {
            obj[header] = values[idx] || '';
        });
        data.push(obj);
    }
    
    return data;
}

// =====================================================
// FALLBACK DATA (untuk demo/testing tanpa Supabase)
// =====================================================

function loadPengusulanFallback(filters) {
    console.log('[SIMBAKES] Using fallback pengusulan data');
    
    // Sample data based on Excel structure
    const sampleData = [
        {
            id: '1',
            nik: '6402137101990001',
            nama: 'Devi Nilam Laila Safitri',
            tempatLahir: 'Tenggarong',
            tanggalLahir: '31 Januari 1999',
            alamatKTP: 'JL BPPN Handil II RT001/RW000, Sungai Seluang, samboja, kalimantan timur',
            alamatDomisili: 'JL BPPN Handil II RT001/RW000, Sungai Seluang, samboja, kalimantan timur',
            lamaDomisili: 5,
            pekerjaan: '-',
            posisi: '-',
            unitKerja: 'Puskesmas Samboja',
            narasi: '-',
            jurusan: 'spesialis_radiologi',
            jenjang: 'Sp1',
            unitTujuan: 'RSUD Aji Muhammad Idris',
            tahunStudi: 2026,
            noHP: '895342049731',
            whatsapp: '895342049731',
            email: 'Nilamlaila31@gmail.com',
            status: 'diajukan'
        },
        {
            id: '2',
            nik: '6402061211970002',
            nama: 'Dani Alfian',
            tempatLahir: 'Blitar',
            tanggalLahir: '12 November 1997',
            alamatKTP: 'Jalan Mangkuraja Gang Silaturahmi',
            alamatDomisili: 'Jalan Mangkuraja Gang Silaturahmi',
            lamaDomisili: 4,
            pekerjaan: '-',
            posisi: '-',
            unitKerja: '-',
            narasi: '-',
            jurusan: 'spesialis_anak',
            jenjang: 'Sp1',
            unitTujuan: 'RSUD Aji Muhammad Idris',
            tahunStudi: 2026,
            noHP: '81350012810',
            whatsapp: '81350012810',
            email: 'danyalfian1@gmail.com',
            status: 'diajukan'
        }
    ];
    
    return { success: true, data: sampleData, total: sampleData.length };
}

function loadPenetapanFallback(filters) {
    console.log('[SIMBAKES] Using fallback penetapan data');
    
    const sampleData = [
        {
            id: '1',
            nik: '6402144203080002',
            nama: 'Siti Patimah',
            jurusan: 'bidan',
            jenjang: 'S1 + Profesi',
            unitTujuan: 'RSUD Aji Batara Agung Dewa Sakti',
            tahunStudi: 2026,
            noSK: '-',
            tanggalPenetapan: '-',
            status: 'pending',
            catatan: '-',
            fotoPasfoto: 'https://drive.google.com/file/d/1QoFj-J_D-RCZk5d89dxGB3DHz2lB-KF2/view',
            dokumenPDF: 'https://drive.google.com/file/d/10Z2KskCwR0_1Us8fwu-ydRV4tNWN4SNT/view',
            periode: '-'
        }
    ];
    
    return { success: true, data: sampleData, total: sampleData.length };
}

function loadRoadmapFallback(filters) {
    console.log('[SIMBAKES] Using fallback roadmap data');
    
    return { 
        success: true, 
        data: [], 
        total: 0,
        message: 'Roadmap data kosong - silakan tambahkan melalui form'
    };
}

// =====================================================
// NOTIFICATION & LOADING HELPERS
// =====================================================

function showNotification(message, type = 'info') {
    // Check if template has notification system
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, type);
    } else if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        // Create custom notification
        createCustomNotification(message, type);
    }
}

function createCustomNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `simbakes-notification simbakes-notification-${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
        <button onclick="this.parentElement.remove()" class="notification-close">&times;</button>
    `;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '8px',
        backgroundColor: getNotificationColor(type),
        color: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '10000',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontFamily: 'inherit',
        animation: 'slideIn 0.3s ease-out',
        maxWidth: '400px'
    });
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#059669',
        error: '#dc2626',
        warning: '#d97706',
        info: '#2563eb'
    };
    return colors[type] || colors.info;
}

function showLoading(show, text = 'Memuat data...') {
    let loader = document.getElementById('simbakes-loader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'simbakes-loader';
            loader.innerHTML = `
                <div class="loader-spinner"></div>
                <span class="loader-text">${text}</span>
            `;
            Object.assign(loader.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '9999',
                color: '#fff'
            });
            document.body.appendChild(loader);
            
            // Add spinner style
            const style = document.createElement('style');
            style.textContent = `
                .loader-spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
            `;
            document.head.appendChild(style);
        }
        loader.querySelector('.loader-text').textContent = text;
        loader.style.display = 'flex';
    } else if (loader) {
        loader.style.display = 'none';
    }
}

// =====================================================
// AUTO-INTEGRATION ON DOM READY
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[SIMBAKES] Integration layer loaded');
    console.log('[SIMBAKES] Checking Supabase configuration...');
    
    const isConfigured = checkSupabaseConfig();
    
    if (isConfigured) {
        console.log('[SIMBAKES] ✅ Supabase configured - using live database');
        
        // Initialize Supabase client
        await simbakesDB.init();
        
        // Check for existing session
        const session = await simbakesDB.checkSession();
        if (session) {
            console.log('[SIMBAKES] Session found for:', session.username);
        }
    } else {
        console.log('[SIMBAKES] ⚠️ Supabase not configured - using fallback/demo mode');
        console.log('[SIMBAKES] To connect to Supabase:');
        console.log('[SIMBAKES]   1. Open supabase-client.js');
        console.log('[SIMBAKES]   2. Replace YOUR_SUPABASE_URL with your project URL');
        console.log('[SIMBAKES]   3. Replace YOUR_SUPABASE_ANON_KEY with your anon key');
        console.log('[SIMBAKES]   4. Run the SQL schema in Supabase SQL Editor');
    }
});

// =====================================================
// EXPORT GLOBAL FUNCTIONS FOR TEMPLATE ACCESS
// =====================================================

// Make functions available globally so template can call them
window.SimbakesIntegration = {
    // Auth
    login: handleLoginSupabase,
    logout: handleLogoutSupabase,
    
    // Pengusulan
    loadPengusulan: loadDataPengusulan,
    insertPengusulan: insertPengusulanSupabase,
    updatePengusulan: updatePengusalanSupabase,
    
    // Penetapan
    loadPenetapan: loadDataPenetapan,
    savePenetapan: savePenetapanSupabase,
    
    // Roadmap
    loadRoadmap: loadRoadmapSupabase,
    saveRoadmap: saveRoadmapSupabase,
    
    // Dashboard
    getStats: loadDashboardStats,
    
    // Import/Export
    exportExcel: exportToExcel,
    importExcel: importFromExcel,
    
    // Utilities
    checkConfig: checkSupabaseConfig,
    showNotif: showNotification,
    setLoading: showLoading
};

console.log('[SIMBAKES] Integration layer ready - window.SimbakesIntegration available');
