/**
 * SIMBAKES - Supabase Client Module
 * Beasiswa Tematik Bidang Kesehatan
 * 
 * Modul ini menyediakan:
 * - Inisialisasi Supabase client
 * - Fungsi query helper untuk semua tabel
 * - Error handling standar
 */

// ============================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================

let supabaseClient = null;

/**
 * Initialize dan return Supabase client instance
 * @returns {SupabaseClient} Supabase client instance
 */
function getSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }
    
    // Cek apakah Supabase library loaded
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase library belum dimuat. Pastikan script tag sudah ditambahkan.');
        throw new Error('Supabase library not loaded');
    }
    
    // Cek konfigurasi
    if (!window.SUPABASE_CONFIG) {
        console.error('❌ Konfigurasi Supabase belum dimuat. Pastikan supabase-config.js sudah di-include.');
        throw new Error('Supabase config not loaded');
    }
    
    // Initialize client
    supabaseClient = window.supabase.createClient(
        window.SUPABASE_CONFIG.url,
        window.SUPABASE_CONFIG.anonKey,
        window.SUPABASE_CONFIG.options || {}
    );
    
    console.log('✅ Supabase client initialized');
    return supabaseClient;
}

/**
 * Get singleton instance (alias)
 */
const supabase = () => getSupabaseClient();


// ============================================================
// QUERY HELPERS - ROADMAP_KEBUTUHAN
// ============================================================

const RoadmapKebutuhan = {
    /**
     * Get all roadmap data
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Supabase response
     */
    async getAll(options = {}) {
        const client = getSupabaseClient();
        let query = client.from('roadmap_kebutuhan').select('*');
        
        if (options.orderBy) {
            query = query.order(options.orderBy.column, { 
                ascending: options.orderBy.ascending !== false 
            });
        } else {
            query = query.order('tahun_mulai_studi', { ascending: true });
        }
        
        return await query;
    },
    
    /**
     * Get roadmap by kode
     * @param {string} kode - Kode kebutuhan
     * @returns {Promise<Object>} Supabase response
     */
    async getByKode(kode) {
        const client = getSupabaseClient();
        return await client.from('roadmap_kebutuhan').select('*').eq('kode', kode).single();
    },
    
    /**
     * Get statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        const client = getSupabaseClient();
        
        const { data: allData, error } = await this.getAll();
        
        if (error) {
            return { total: 0, aktif: 0, terpenuhi: 0, tersedia: 0 };
        }
        
        return {
            total: allData.length,
            aktif: allData.filter(item => item.status === 'aktif').length,
            terpenuhi: allData.filter(item => item.status === 'terpenuhi').length,
            tersedia: allData.filter(item => item.status === 'aktif').length
        };
    }
};


// ============================================================
// QUERY HELPERS - DATA_PENGUSULAN
// ============================================================

const DataPengusulan = {
    /**
     * Get all pengusulan data
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Supabase response
     */
    async getAll(options = {}) {
        const client = getSupabaseClient();
        let query = client.from('data_pengusulan').select('*');
        
        if (options.orderBy) {
            query = query.order(options.orderBy.column, { 
                ascending: options.orderBy.ascending !== false 
            });
        } else {
            query = query.order('nama_lengkap', { ascending: true });
        }
        
        if (options.filter) {
            Object.keys(options.filter).forEach(key => {
                if (options.filter[key]) {
                    query = query.eq(key, options.filter[key]);
                }
            });
        }
        
        return await query;
    },
    
    /**
     * Get pengusulan by NIK
     * @param {string} nik - NIK calon penerima
     * @returns {Promise<Object>} Supabase response
     */
    async getByNIK(nik) {
        const client = getSupabaseClient();
        return await client.from('data_pengusulan').select('*').eq('nik', nik).single();
    },
    
    /**
     * Insert new pengusulan
     * @param {Object} data - Data pengusulan (21 fields)
     * @returns {Promise<Object>} Supabase response
     */
    async insert(data) {
        const client = getSupabaseClient();
        return await client.from('data_pengusulan').insert([data]).select();
    },
    
    /**
     * Update existing pengusulan
     * @param {string} nik - NIK to update
     * @param {Object} data - Data to update
     * @returns {Promise<Object>} Supabase response
     */
    async update(nik, data) {
        const client = getSupabaseClient();
        return await client.from('data_pengusulan').update(data).eq('nik', nik).select();
    },
    
    /**
     * Delete pengusulan
     * @param {string} nik - NIK to delete
     * @returns {Promise<Object>} Supabase response
     */
    async delete(nik) {
        const client = getSupabaseClient();
        return await client.from('data_pengusulan').delete().eq('nik', nik);
    },
    
    /**
     * Update status
     * @param {string} nik - NIK
     * @param {string} status - New status
     * @returns {Promise<Object>} Supabase response
     */
    async updateStatus(nik, status) {
        return await this.update(nik, { status });
    }
};


// ============================================================
// QUERY HELPERS - DATA_PENETAPAN
// ============================================================

const DataPenetapan = {
    /**
     * Get all penetapan data (standalone, no JOIN)
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Supabase response
     */
    async getAll(options = {}) {
        const client = getSupabaseClient();
        let query = client.from('data_penetapan').select('*');
        
        if (options.orderBy) {
            query = query.order(options.orderBy.column, { 
                ascending: options.orderBy.ascending !== false 
            });
        } else {
            query = query.order('tanggal_penetapan', { ascending: false });
        }
        
        return await query;
    },
    
    /**
     * Get penetapan by NIK
     * @param {string} nik - NIK penerima
     * @returns {Promise<Object>} Supabase response
     */
    async getByNIK(nik) {
        const client = getSupabaseClient();
        return await client.from('data_penetapan').select('*').eq('nik', nik).single();
    },
    
    /**
     * Get penetapan by No SK
     * @param {string} noSK - Nomor SK penetapan
     * @returns {Promise<Object>} Supabase response
     */
    async getByNoSK(noSK) {
        const client = getSupabaseClient();
        return await client.from('data_penetapan').select('*').eq('no_sk_penetapan', noSK).single();
    },
    
    /**
     * Insert new penetapan
     * @param {Object} data - Data penetapan (13 fields)
     * @returns {Promise<Object>} Supabase response
     */
    async insert(data) {
        const client = getSupabaseClient();
        return await client.from('data_penetapan').insert([data]).select();
    },
    
    /**
     * Update existing penetapan
     * @param {string} nik - NIK to update
     * @param {Object} data - Data to update
     * @returns {Promise<Object>} Supabase response
     */
    async update(nik, data) {
        const client = getSupabaseClient();
        return await client.from('data_penetapan').update(data).eq('nik', nik).select();
    },
    
    /**
     * Get statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        const { data: allData, error } = await this.getAll();
        
        if (error) {
            return { total: 0, aktif: 0, selesai: 0, lainnya: 0 };
        }
        
        return {
            total: allData.length,
            aktif: allData.filter(item => item.status_penetapan === 'aktif').length,
            selesai: allData.filter(item => item.status_penetapan === 'selesai').length,
            lainnya: allData.filter(item => !['aktif', 'selesai'].includes(item.status_penetapan)).length
        };
    }
};


// ============================================================
// QUERY HELPERS - MULTIUSERS
// ============================================================

const Multiusers = {
    /**
     * Get all users
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Supabase response
     */
    async getAll(options = {}) {
        const client = getSupabaseClient();
        let query = client.from('multiusers').select('*');
        
        if (options.orderBy) {
            query = query.order(options.orderBy.column, { 
                ascending: options.orderBy.ascending !== false 
            });
        } else {
            query = query.order('nama_lengkap', { ascending: true });
        }
        
        return await query;
    },
    
    /**
     * Get user by ID (UUID)
     * @param {string} id - User UUID
     * @returns {Promise<Object>} Supabase response
     */
    async getById(id) {
        const client = getSupabaseClient();
        return await client.from('multiusers').select('*').eq('id', id).single();
    },
    
    /**
     * Get user by email
     * @param {string} email - User email
     * @returns {Promise<Object>} Supabase response
     */
    async getByEmail(email) {
        const client = getSupabaseClient();
        return await client.from('multiusers').select('*').eq('email', email).single();
    },
    
    /**
     * Insert new user (manual, tanpa Auth trigger)
     * @param {Object} data - User data
     * @returns {Promise<Object>} Supabase response
     */
    async insert(data) {
        const client = getSupabaseClient();
        return await client.from('multiusers').insert([data]).select();
    },
    
    /**
     * Update user
     * @param {string} id - User UUID
     * @param {Object} data - Data to update
     * @returns {Promise<Object>} Supabase response
     */
    async update(id, data) {
        const client = getSupabaseClient();
        return await client.from('multiusers').update(data).eq('id', id).select();
    },
    
    /**
     * Update user status
     * @param {string} id - User UUID
     * @param {string} status - New status (aktif/non-aktif/blokir)
     * @returns {Promise<Object>} Supabase response
     */
    async updateStatus(id, status) {
        return await this.update(id, { status });
    },
    
    /**
     * Update user role
     * @param {string} id - User UUID
     * @param {string} role - New role
     * @returns {Promise<Object>} Supabase response
     */
    async updateRole(id, role) {
        return await this.update(id, { role });
    },
    
    /**
     * Delete user
     * @param {string} id - User UUID
     * @returns {Promise<Object>} Supabase response
     */
    async delete(id) {
        const client = getSupabaseClient();
        return await client.from('multiusers').delete().eq('id', id);
    },
    
    /**
     * Get statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        const { data: allData, error } = await this.getAll();
        
        if (error) {
            return { total: 0, aktif: 0, nonAktif: 0, blokir: 0 };
        }
        
        return {
            total: allData.length,
            aktif: allData.filter(u => u.status === 'aktif').length,
            nonAktif: allData.filter(u => u.status === 'non-aktif').length,
            blokir: allData.filter(u => u.status === 'blokir').length
        };
    },
    
    /**
     * Get role distribution
     * @returns {Promise<Object>} Role counts
     */
    async getRoleDistribution() {
        const { data: allData, error } = await this.getAll();
        
        if (error) {
            return {};
        }
        
        const roles = ['super_admin', 'admin', 'approver', 'operator', 'viewer'];
        const distribution = {};
        
        roles.forEach(role => {
            distribution[role] = allData.filter(u => u.role === role).length;
        });
        
        return distribution;
    }
};


// ============================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================

window.getSupabaseClient = getSupabaseClient;
window.RoadmapKebutuhan = RoadmapKebutuhan;
window.DataPengusulan = DataPengusulan;
window.DataPenetapan = DataPenetapan;
window.Multiusers = Multiusers;
