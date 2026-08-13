/**
 * ============================================
 * SIMBAKES - Supabase Client Helper
 * ============================================
 * 
 * Library untuk mengelola koneksi dan operasi database
 * menggunakan Supabase (PostgreSQL).
 */

class SIMBAKESDB {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.initialized = false;
    }

    /**
     * Inisialisasi koneksi ke Supabase
     */
    async init() {
        if (this.initialized) return this.client;

        try {
            // Load Supabase library jika belum ada
            if (typeof window.supabase === 'undefined') {
                await this.loadSupabaseSDK();
            }

            // Validasi config
            if (!window.SUPABASE_CONFIG || !validateSupabaseConfig()) {
                console.warn('⚠️ Menggunakan mode demo (tanpa database)');
                this.isConnected = false;
                this.initialized = true;
                return null;
            }

            // Buat client
            this.client = window.supabase.createClient(
                SUPABASE_CONFIG.URL,
                SUPABASE_CONFIG.ANON_KEY,
                SUPABASE_CONFIG.OPTIONS
            );

            this.isConnected = true;
            this.initialized = true;

            console.log('✅ SIMBAKES - Terhubung ke Supabase');
            return this.client;

        } catch (error) {
            console.error('❌ Gagal terhubung ke Supabase:', error);
            this.isConnected = false;
            this.initialized = true;
            return null;
        }
    }

    /**
     * Load Supabase SDK dari CDN
     */
    async loadSupabaseSDK() {
        return new Promise((resolve, reject) => {
            if (window.supabase) {
                resolve(window.supabase);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@supabase/supabase-js@2';
            script.onload = () => resolve(window.supabase);
            script.onerror = () => reject(new Error('Gagal load Supabase SDK'));
            document.head.appendChild(script);
        });
    }

    // ============================================
    // GENERIC CRUD OPERATIONS
    // ============================================

    /**
     * Ambil semua data dari tabel
     */
    async getAll(table, options = {}) {
        if (!this.isConnected) return this.getDemoData(table);

        try {
            let query = this.client.from(table).select(options.select || '*');

            if (options.filter) {
                Object.entries(options.filter).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
            }

            if (options.order) {
                query = query.order(options.order.column, { 
                    ascending: options.order.ascending ?? false 
                });
            }

            if (options.limit) {
                query = query.limit(options.limit);
            }

            if (options.range) {
                query = query.range(options.range.start, options.range.end);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;

        } catch (error) {
            console.error(`Error getAll(${table}):`, error);
            return [];
        }
    }

    /**
     * Ambil data by ID
     */
    async getById(table, id, idColumn = 'id') {
        if (!this.isConnected) return null;

        try {
            const { data, error } = await this.client
                .from(table)
                .select('*')
                .eq(idColumn, id)
                .single();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error(`Error getById(${table}, ${id}):`, error);
            return null;
        }
    }

    /**
     * Cari data dengan kondisi custom
     */
    async find(table, conditions) {
        if (!this.isConnected) return [];

        try {
            let query = this.client.from(table).select('*');

            Object.entries(conditions).forEach(([key, value]) => {
                if (typeof value === 'string' && value.includes('%')) {
                    query = query.ilike(key, value.replace(/%/g, ''));
                } else {
                    query = query.eq(key, value);
                }
            });

            const { data, error } = await query;

            if (error) throw error;
            return data;

        } catch (error) {
            console.error(`Error find(${table}):`, error);
            return [];
        }
    }

    /**
     * Insert data baru
     */
    async insert(table, data, options = {}) {
        if (!this.isConnected) {
            // Return demo data untuk mode offline
            return this.insertDemoData(table, data);
        }

        try {
            const { data: result, error } = await this.client
                .from(table)
                .insert(data)
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Data berhasil ditambahkan ke ${table}:`, result.id || result.nomor_usulan);
            return result;

        } catch (error) {
            console.error(`Error insert(${table}):`, error);
            throw error;
        }
    }

    /**
     * Update data
     */
    async update(table, id, data, idColumn = 'id') {
        if (!this.isConnected) {
            console.log(`📝 Demo: Update ${table} ID ${id}`);
            return { ...data, [idColumn]: id };
        }

        try {
            // Add updated_at timestamp
            data.updated_at = new Date().toISOString();

            const { data: result, error } = await this.client
                .from(table)
                .update(data)
                .eq(idColumn, id)
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Data berhasil diupdate di ${table}:`, id);
            return result;

        } catch (error) {
            console.error(`Error update(${table}, ${id}):`, error);
            throw error;
        }
    }

    /**
     * Delete data (soft delete by default)
     */
    async delete(table, id, idColumn = 'id', hardDelete = false) {
        if (!this.isConnected) {
            console.log(`🗑️ Demo: Delete ${table} ID ${id}`);
            return true;
        }

        try {
            let result;

            if (hardDelete) {
                ({ result, error: result.error } = await this.client
                    .from(table)
                    .delete()
                    .eq(idColumn, id));
            } else {
                // Soft delete - set deleted_at timestamp
                ({ data: result, error: result.error } = await this.client
                    .from(table)
                    .update({ deleted_at: new Date().toISOString(), status: 'withdrawn' })
                    .eq(idColumn, id));
            }

            if (result.error) throw result.error;

            console.log(`✅ Data berhasil dihapus dari ${table}:`, id);
            return true;

        } catch (error) {
            console.error(`Error delete(${table}, ${id}):`, error);
            throw error;
        }
    }

    /**
     * Count records dengan filter
     */
    async count(table, filter = {}) {
        if (!this.isConnected) return 0;

        try {
            let query = this.client.from(table, { count: 'exact' }).select('*', { count: 'exact' });

            Object.entries(filter).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            const { count, error } = await query;

            if (error) throw error;
            return count;

        } catch (error) {
            console.error(`Error count(${table}):`, error);
            return 0;
        }
    }

    // ============================================
    // SIMBAKES SPECIFIC OPERATIONS
    // ============================================

    /**
     * Submit pengusulan beasiswa baru
     */
    async submitPengusulan(formData) {
        const pengusulanData = {
            nomor_usulan: generateNomorUsulan(),
            nama_lengkap: formData.nama_lengkap,
            nik: formData.nik,
            tempat_lahir: formData.tempat_lahir,
            tanggal_lahir: formData.tanggal_lahir,
            jenis_kelamin: formData.jenis_kelamin,
            agama: formData.agama,
            alamat: formData.alamat,
            no_hp: formData.no_hp,
            email: formData.email,
            pendidikan_terakhir: formData.pendidikan_terakhir,
            program_studi_dituju: formData.program_studi_dituju,
            nama_institusi: formData.nama_institusi,
            ipk: parseFloat(formData.ipk),
            tahun_lulus: formData.tahun_lulus,
            nomor_ijazah: formData.nomor_ijazah,
            status: STATUS.USULAN.SUBMITTED,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        return await this.insert(TABLES.PENGUSULAN, pengusulanData);
    }

    /**
     * Cek status pengusulan by nomor atau NIK
     */
    async cekStatusPengusulan(searchTerm, searchBy = 'nomor_usulan') {
        if (!this.isConnected) {
            return this.getDemoPengusulan(searchTerm);
        }

        try {
            const { data, error } = await this.client
                .from(TABLES.PENGUSULAN)
                .select('*')
                .ilike(searchBy, `%${searchTerm}%`)
                .maybeSingle();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Error cekStatusPengusulan:', error);
            return null;
        }
    }

    /**
     * Cek status penetapan by NIK atau nomor pendaftar
     */
    async cekStatusPenetapan(searchTerm) {
        if (!this.isConnected) {
            return this.getDemoPenetapan();
        }

        try {
            const { data, error } = await this.client
                .from(TABLES.PENETAPAN)
                .select(`
                    *,
                    ${TABLES.PENGUSULAN}(*)
                `)
                .or(`nik.ilike.%${searchTerm}%,nomor_pendaftar.ilike.%${searchTerm}%`)
                .maybeSingle();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Error cekStatusPenetapan:', error);
            return null;
        }
    }

    /**
     * Ambil statistik dashboard
     */
    async getDashboardStats() {
        if (!this.isConnected) {
            return this.getDemoStats();
        }

        try {
            const [
                totalResult,
                approvedResult,
                reviewResult,
                rejectedResult
            ] = await Promise.all([
                this.count(TABLES.PENGUSULAN),
                this.count(TABLES.PENGUSULAN, { status: STATUS.USULAN.APPROVED }),
                this.count(TABLES.PENGUSULAN, { status: STATUS.USULAN.REVIEW }),
                this.count(TABLES.PENGUSULAN, { status: STATUS.USULAN.REJECTED })
            ]);

            return {
                total: totalResult,
                disetujui: approvedResult,
                dalam_proses: reviewResult,
                ditolak: rejectedResult
            };

        } catch (error) {
            console.error('Error getDashboardStats:', error);
            return this.getDemoStats();
        }
    }

    /**
     * Subscribe to realtime changes
     */
    subscribeToTable(table, callback) {
        if (!this.isConnected || !this.client) return null;

        return this.client
            .from(table)
            .on('*', (payload) => {
                console.log(`Realtime change detected in ${table}:`, payload.eventType);
                callback(payload);
            })
            .subscribe();
    }

    // ============================================
    // DEMO/OFFLINE MODE DATA
    // ============================================

    getDemoData(table) {
        switch (table) {
            case TABLES.PENGUSULAN:
                return DEMO_DATA.pengusulan;
            case TABLES.PENETAPAN:
                return DEMO_DATA.penetapan;
            case TABLES.ROADMAP:
                return DEMO_DATA.roadmap;
            case TABLES.INFORMASI:
                return DEMO_DATA.informasi;
            default:
                return [];
        }
    }

    getDemoPengusulan(searchTerm) {
        const data = DEMO_DATA.pengusulan.find(p => 
            p.nomor_usulan?.includes(searchTerm) || 
            p.nik?.includes(searchTerm)
        );
        return data || null;
    }

    getDemoPenetapan() {
        return Math.random() > 0.3 ? DEMO_DATA.penetapan[0] : null;
    }

    getDemoStats() {
        return {
            total: 156,
            disetujui: 89,
            dalam_proses: 42,
            ditolak: 25
        };
    }

    insertDemoData(table, data) {
        const newItem = {
            ...data,
            id: Date.now(),
            nomor_usulan: data.nomor_usulan || generateNomorUsulan(),
            created_at: new Date().toISOString(),
            status: 'submitted'
        };
        
        console.log(`📝 Demo: Data baru ditambahkan ke ${table}`, newItem);
        return newItem;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateNomorUsulan() {
    const year = new Date().getFullYear();
    const random = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
    return `USL-${year}-${random}`;
}

function generateNomorPenetapan() {
    const year = new Date().getFullYear();
    const random = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
    return `PNT-${year}-${random}`;
}

// ============================================
// DEMO DATA (untuk mode offline/testing)
// ============================================

const DEMO_DATA = {
    pengusulan: [
        {
            id: 1,
            nomor_usulan: 'USL-2024-0001',
            nama_lengkap: 'Ahmad Fauzi',
            nik: '3201010101010001',
            tempat_lahir: 'Jakarta',
            tanggal_lahir: '1995-05-15',
            jenis_kelamin: 'L',
            agama: 'Islam',
            alamat: 'Jl. Merdeka No. 10, Jakarta Pusat',
            no_hp: '081234567890',
            email: 'ahmad.fauzi@email.com',
            pendidikan_terakhir: 'S1',
            program_studi_dituju: 'Keperawatan-S1',
            nama_institusi: 'Universitas Indonesia',
            ipk: 3.75,
            tahun_lulus: '2023',
            nomor_ijazah: 'IJZ-2023-001234',
            status: 'approved',
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-20T14:00:00Z'
        },
        {
            id: 2,
            nomor_usulan: 'USL-2024-0002',
            nama_lengkap: 'Siti Nurhaliza',
            nik: '3202010202020002',
            tempat_lahir: 'Bandung',
            tanggal_lahir: '1997-08-22',
            jenis_kelamin: 'P',
            agama: 'Islam',
            alamat: 'Jl. Asia Afrika No. 25, Bandung',
            no_hp: '082345678901',
            email: 'siti.nurhaliza@email.com',
            pendidikan_terakhir: 'S1',
            program_studi_dituju: 'Profesi-Dokter',
            nama_institusi: 'Universitas Gadjah Mada',
            ipk: 3.85,
            tahun_lulus: '2023',
            nomor_ijazah: 'IJZ-2023-002345',
            status: 'review',
            created_at: '2024-01-18T09:15:00Z',
            updated_at: '2024-01-18T09:15:00Z'
        },
        {
            id: 3,
            nomor_usulan: 'USL-2024-0003',
            nama_lengkap: 'Budi Santoso',
            nik: '3203030303030003',
            tempat_lahir: 'Surabaya',
            tanggal_lahir: '1996-12-10',
            jenis_kelamin: 'L',
            agama: 'Kristen',
            alamat: 'Jl. Tunjungan No. 5, Surabaya',
            no_hp: '083456789012',
            email: 'budi.santoso@email.com',
            pendidikan_terakhir: 'D3',
            program_studi_dituju: 'Farmasi-S1',
            nama_institusi: 'Institut Teknologi Bandung',
            ipk: 3.45,
            tahun_lulus: '2022',
            nomor_ijazah: 'IJZ-2022-003456',
            status: 'rejected',
            created_at: '2024-01-20T11:45:00Z',
            updated_at: '2024-01-25T16:30:00Z'
        },
        {
            id: 4,
            nomor_usulan: 'USL-2024-0004',
            nama_lengkap: 'Dewi Lestari',
            nik: '3204040404040004',
            tempat_lahir: 'Yogyakarta',
            tanggal_lahir: '1998-03-28',
            jenis_kelamin: 'P',
            agama: 'Islam',
            alamat: 'Jl. Malioboro No. 100, Yogyakarta',
            no_hp: '084567890123',
            email: 'dewi.lestari@email.com',
            pendidikan_terakhir: 'S1',
            program_studi_dituju: 'KM-S2',
            nama_institusi: 'Universitas Airlangga',
            ipk: 3.90,
            tahun_lulus: '2023',
            nomor_ijazah: 'IJZ-2023-004567',
            status: 'draft',
            created_at: '2024-01-22T13:20:00Z',
            updated_at: '2024-01-22T13:20:00Z'
        },
        {
            id: 5,
            nomor_usulan: 'USL-2024-0005',
            nama_lengkap: 'Rizky Pratama',
            nik: '3205050505050005',
            tempat_lahir: 'Semarang',
            tanggal_lahir: '1996-07-17',
            jenis_kelamin: 'L',
            agama: 'Islam',
            alamat: 'Jl. Pemuda No. 50, Semarang',
            no_hp: '085678901234',
            email: 'rizky.pratama@email.com',
            pendidikan_terakhir: 'SMA/SMK',
            program_studi_dituju: 'Gizi-S1',
            nama_institusi: 'Universitas Diponegoro',
            ipk: null,
            tahun_lulus: '2024',
            nomor_ijazah: null,
            status: 'approved',
            created_at: '2024-01-25T08:00:00Z',
            updated_at: '2024-02-01T10:15:00Z'
        }
    ],

    penetapan: [
        {
            id: 1,
            nomor_penetapan: 'PNT-2024-0156',
            nomor_pendaftar: 'DAF-2024-0156',
            nik: '3201010101010001',
            nama_lengkap: 'Ahmad Fauzi',
            program_studi: 'Keperawatan (S1)',
            institusi: 'Universitas Indonesia',
            batch: 'Batch 1',
            tanggal_penetapan: '2024-02-01',
            status_dana: 'disbursed',
            nominal: 7500000,
            created_at: '2024-02-01T00:00:00Z'
        }
    ],

    roadmap: [
        {
            id: 1,
            program_studi: 'Keperawatan',
            jenjang: 'S1',
            kuota: 150,
            terdaftar: 142,
            tersisa: 8,
            persentase: 94.67,
            budget: 7500000,
            status: 'available',
            tahun: 2024
        },
        {
            id: 2,
            program_studi: 'Kedokteran',
            jenjang: 'Profesi',
            kuota: 100,
            terdaftar: 98,
            tersisa: 2,
            persentase: 98,
            budget: 10000000,
            status: 'limited',
            tahun: 2024
        },
        {
            id: 3,
            program_studi: 'Kesehatan Masyarakat',
            jenjang: 'S2',
            kuota: 80,
            terdaftar: 65,
            tersisa: 15,
            persentase: 81.25,
            budget: 5000000,
            status: 'available',
            tahun: 2024
        },
        {
            id: 4,
            program_studi: 'Farmasi',
            jenjang: 'S1',
            kuota: 90,
            terdaftar: 68,
            tersisa: 22,
            persentase: 75.56,
            budget: 4500000,
            status: 'available',
            tahun: 2024
        },
        {
            id: 5,
            program_studi: 'Gizi',
            jenjang: 'S1/S2',
            kuota: 80,
            terdaftar: 47,
            tersisa: 33,
            persentase: 58.75,
            budget: 3000000,
            status: 'available',
            tahun: 2024
        }
    ],

    informasi: [
        {
            id: 1,
            judul: 'Pendaftaran Beasiswa Tematik Kesehatan 2024 Resmi Dibuka',
            kategori: 'Berita Utama',
            konten: 'Kementerian Kesehatan membuka pendaftaran beasiswa tematik bidang kesehatan tahun anggaran 2024...',
            tanggal: '2024-01-15',
            views: 2534,
            featured: true
        },
        {
            id: 2,
            judul: 'Perpanjangan Batas Waktu Pengusulan',
            kategori: 'Pengumuman',
            konten: 'Batas waktu pengiriman usulan diperpanjang hingga 30 Juni 2024...',
            tanggal: '2024-06-10',
            views: 1523,
            urgent: true
        }
    ]
};

// ============================================
// INITIALIZE & EXPORT
// ============================================

// Create global instance
const db = new SIMBAKESDB();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => db.init());
} else {
    db.init();
}

// Export for global use
window.SIMBAKESDB = db;
window.DEMO_DATA = DEMO_DATA;

console.log('📦 SIMBAKES - Database Helper Loaded');
