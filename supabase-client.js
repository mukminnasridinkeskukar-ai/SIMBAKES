/**
 * =====================================================
 * SIMBAKES - Supabase Client Configuration
 * Beasiswa Tematik Bidang Kesehatan
 * =====================================================
 * 
 * INSTRUKSI SETUP:
 * 1. Buat project di https://supabase.com
 * 2. Copy URL dan Anon Key dari Settings > API
 * 3. Isi konfigurasi di bawah ini
 * 4. Jalankan SQL schema di SQL Editor Supabase
 * 5. Configure CORS di Settings > API > URL Configuration
 */

// =====================================================
// KONFIGURASI SUPABASE - ISI DENGAN CREDENTIAL ANDA
// =====================================================
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // e.g., https://abcdefghijk.supabase.co
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // Dari Settings > API > Project API keys > anon public
};

// =====================================================
// SUPABASE CLIENT INITIALIZATION
// =====================================================
class SimbakesSupabase {
    constructor() {
        this.client = null;
        this.currentUser = null;
        this.isInitialized = false;
    }

    /**
     * Initialize Supabase client
     */
    async init() {
        if (this.isInitialized) return this.client;

        try {
            // Load Supabase JS SDK from CDN if not available
            if (typeof window.supabase === 'undefined' && typeof window.createClient === 'undefined') {
                await this.loadSupabaseSDK();
            }

            // Create client
            this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                },
                global: {
                    headers: {
                        'x-application-name': 'simbakes'
                    }
                }
            });

            this.isInitialized = true;
            console.log('[SIMBAKES] Supabase client initialized');
            
            // Check existing session
            await this.checkSession();
            
            return this.client;
        } catch (error) {
            console.error('[SIMBAKES] Failed to initialize Supabase:', error);
            throw error;
        }
    }

    /**
     * Load Supabase JS SDK from CDN
     */
    loadSupabaseSDK() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Supabase SDK'));
            document.head.appendChild(script);
        });
    }

    // =====================================================
    // AUTHENTICATION METHODS
    // =====================================================

    /**
     * Login with username/password (custom implementation)
     * Uses multiusers table for authentication
     */
    async login(username, password) {
        try {
            const { data, error } = await this.client
                .from('multiusers')
                .select('*')
                .eq('username', username)
                .eq('status', 'aktif')
                .single();

            if (error) throw error;

            // In production, password comparison should be done via RPC/Edge Function
            // For now, we'll use a simple check (implement proper hashing in production)
            if (data.password === password || data.password === password) {
                this.currentUser = data;
                
                // Store session in localStorage for persistence
                localStorage.setItem('simbakes_user', JSON.stringify({
                    id: data.id,
                    nama_lengkap: data.nama_lengkap,
                    username: data.username,
                    role: data.role,
                    email: data.email,
                    loginTime: new Date().toISOString()
                }));

                // Update last_login
                await this.client
                    .from('multiusers')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', data.id);

                return { success: true, user: data };
            } else {
                throw new Error('Password salah');
            }
        } catch (error) {
            console.error('[SIMBAKES] Login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout current user
     */
    async logout() {
        this.currentUser = null;
        localStorage.removeItem('simbakes_user');
        
        // Sign out from Supabase Auth (if using it)
        if (this.client && this.client.auth) {
            await this.client.auth.signOut();
        }

        return { success: true };
    }

    /**
     * Check existing session
     */
    async checkSession() {
        const storedUser = localStorage.getItem('simbakes_user');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                return this.currentUser;
            } catch (e) {
                localStorage.removeItem('simbakes_user');
            }
        }
        return null;
    }

    /**
     * Get current user role
     */
    getUserRole() {
        return this.currentUser?.role || null;
    }

    /**
     * Check if user has required role
     */
    hasRole(requiredRoles) {
        if (!this.currentUser) return false;
        if (Array.isArray(requiredRoles)) {
            return requiredRoles.includes(this.currentUser.role);
        }
        return this.currentUser.role === requiredRoles;
    }

    // =====================================================
    // DATA PENGUSULAN METHODS
    // =====================================================

    /**
     * Get all pengusulan data with optional filters
     */
    async getPengusulan(filters = {}) {
        try {
            let query = this.client
                .from('data_pengusulan')
                .select('*', { count: 'exact' });

            // Apply filters
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.jurusan) {
                query = query.eq('jurusan_tujuan', filters.jurusan);
            }
            if (filters.jenjang) {
                query = query.eq('jenjang_pendidikan', filters.jenjang);
            }
            if (filters.search) {
                query = query.or(`nama_lengkap.ilike.%${filters.search}%,nik.ilike.%${filters.search}%`);
            }

            // Pagination
            if (filters.page && filters.pageSize) {
                const from = (filters.page - 1) * filters.pageSize;
                const to = from + filters.pageSize - 1;
                query = query.range(from, to);
            }

            // Sorting
            if (filters.sortBy) {
                const order = filters.sortOrder === 'desc' ? true : false;
                query = query.order(filters.sortBy, { ascending: !order });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                success: true,
                data: data || [],
                total: count || 0
            };
        } catch (error) {
            console.error('[SIMBAKES] Get pengusulan error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get single pengusulan by NIK
     */
    async getPengusulanByNIK(nik) {
        try {
            const { data, error } = await this.client
                .from('data_pengusulan')
                .select('*')
                .eq('nik', nik)
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Insert new pengusulan
     */
    async insertPengusulan(pengusulanData) {
        try {
            const { data, error } = await this.client
                .from('data_pengusulan')
                .insert([{
                    ...pengusulanData,
                    created_by: this.currentUser?.id,
                    status: pengusulanData.status || 'diajukan'
                }])
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('[SIMBAKES] Insert pengusulan error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update pengusulan
     */
    async updatePengusulan(nik, updateData) {
        try {
            const { data, error } = await this.client
                .from('data_pengusulan')
                .update(updateData)
                .eq('nik', nik)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete pengusulan (soft delete - change status)
     */
    async deletePengusulan(nik) {
        try {
            const { error } = await this.client
                .from('data_pengusulan')
                .delete()
                .eq('nik', nik);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // =====================================================
    // DATA PENETAPAN METHODS
    // =====================================================

    /**
     * Get all penetapan data
     */
    async getPenetapan(filters = {}) {
        try {
            let query = this.client
                .from('data_penetapan')
                .select('*', { count: 'exact' });

            if (filters.status) {
                query = query.eq('status_penetapan', filters.status);
            }
            if (filters.periode) {
                query = query.eq('periode_pemberian', filters.periode);
            }
            if (filters.search) {
                query = query.or(`nama_lengkap.ilike.%${filters.search}%,nik.ilike.%${filters.search}%`);
            }

            if (filters.page && filters.pageSize) {
                const from = (filters.page - 1) * filters.pageSize;
                const to = from + filters.pageSize - 1;
                query = query.range(from, to);
            }

            query = query.order('created_at', { ascending: false });

            const { data, error, count } = await query;

            if (error) throw error;

            return { success: true, data: data || [], total: count || 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Insert new penetapan
     */
    async insertPenetapan(penetapanData) {
        try {
            const { data, error } = await this.client
                .from('data_penetapan')
                .insert([{
                    ...penetapanData,
                    approved_by: this.currentUser?.id
                }])
                .select()
                .single();

            if (error) throw error;

            // Update status in pengusulan if approved
            if (penetapanData.status_penetapan === 'disetujui') {
                await this.client
                    .from('data_pengusulan')
                    .update({ status: 'diterima' })
                    .eq('nik', penetapanData.nik);
            }

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Update penetapan
     */
    async updatePenetapan(id, updateData) {
        try {
            const { data, error } = await this.client
                .from('data_penetapan')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // =====================================================
    // ROADMAP KEBUTUHAN METHODS
    // =====================================================

    /**
     * Get all roadmap data
     */
    async getRoadmap(filters = {}) {
        try {
            let query = this.client
                .from('roadmap_kebutuhan')
                .select('*', { count: 'exact' });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.jurusan) {
                query = query.eq('jurusan', filters.jurusan);
            }

            query = query.order('created_at', { ascending: false });

            const { data, error, count } = await query;

            if (error) throw error;

            return { success: true, data: data || [], total: count || 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Insert roadmap entry
     */
    async insertRoadmap(roadmapData) {
        try {
            const { data, error } = await this.client
                .from('roadmap_kebutuhan')
                .insert([roadmapData])
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Update roadmap entry
     */
    async updateRoadmap(id, updateData) {
        try {
            const { data, error } = await this.client
                .from('roadmap_kebutuhan')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // =====================================================
    // DASHBOARD STATISTICS
    // =====================================================

    /**
     * Get dashboard statistics
     */
    async getDashboardStats() {
        try {
            // Use the view we created
            const { data, error } = await this.client
                .from('v_dashboard_stats')
                .select('*')
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            // Fallback to manual calculation
            console.warn('[SIMBAKES] View not found, using fallback');
            return this.getDashboardStatsFallback();
        }
    }

    /**
     * Fallback dashboard stats
     */
    async getDashboardStatsFallback() {
        try {
            const [pengusulanRes, penetapanRes, roadmapRes] = await Promise.all([
                this.client.from('data_pengusulan').select('*', { count: 'exact', head: true }),
                this.client.from('data_penetapan').select('*', { count: 'exact', head: true }),
                this.client.from('roadmap_kebutuhan').select('*', { count: 'exact', head: true })
            ]);

            return {
                success: true,
                data: {
                    total_pengusulan: pengusulanRes.count || 0,
                    pengusulan_baru: 0, // Would need filtered query
                    sedang_diproses: 0,
                    total_diterima: 0,
                    total_ditolak: 0,
                    roadmap_aktif: roadmapRes.count || 0
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // =====================================================
    // BULK OPERATIONS (for Excel import)
    // =====================================================

    /**
     * Bulk insert pengusulan data (from Excel import)
     */
    async bulkInsertPengusulan(dataArray) {
        try {
            // Process in batches of 100
            const batchSize = 100;
            const results = [];

            for (let i = 0; i < dataArray.length; i += batchSize) {
                const batch = dataArray.slice(i, i + batchSize).map(item => ({
                    ...item,
                    created_by: this.currentUser?.id,
                    status: item.status || 'diajukan'
                }));

                const { data, error } = await this.client
                    .from('data_pengusulan')
                    .insert(batch)
                    .select();

                if (error) throw error;
                results.push(...data);
            }

            return { success: true, data: results, count: results.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Bulk insert penetapan data
     */
    async bulkInsertPenetapan(dataArray) {
        try {
            const batchSize = 100;
            const results = [];

            for (let i = 0; i < dataArray.length; i += batchSize) {
                const batch = dataArray.slice(i, i + batchSize).map(item => ({
                    ...item,
                    approved_by: this.currentUser?.id
                }));

                const { data, error } = await this.client
                    .from('data_penetapan')
                    .insert(batch)
                    .select();

                if (error) throw error;
                results.push(...data);
            }

            return { success: true, data: results, count: results.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // =====================================================
    // EXPORT DATA (to Excel/CSV format)
    // =====================================================

    /**
     * Export data to JSON (can be converted to Excel)
     */
    async exportData(table, filters = {}) {
        try {
            let query = this.client.from(table).select('*');

            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo);
            }

            const { data, error } = await query;

            if (error) throw error;

            return { success: true, data: data || [] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// =====================================================
// GLOBAL INSTANCE
// =====================================================
const simbakesDB = new SimbakesSimbakes();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await simbakesDB.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SimbakesSupabase, simbakesDB, SUPABASE_CONFIG };
}
