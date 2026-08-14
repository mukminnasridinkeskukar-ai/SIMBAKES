'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  CheckSquare,
  Search,
  Download,
  Eye,
  Award,
  Calendar,
  User,
  Shield,
  Loader2,
  ExternalLink,
  GraduationCap,
  FileText,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  AlertTriangle
} from 'lucide-react'

// Types based on Excel template data_penetapan sheet (13 columns)
interface PenerimaData {
  id: string
  pengusulan_id: string | null
  user_id: string
  
  // Data from Excel columns (1-7)
  nik: string
  nama_lengkap: string
  jurusan_tujuan: string
  jenjang_pendidikan: string
  unit_tujuan_pemanfaatan: string
  rencana_tahun_studi: number
  
  // Data Penetapan (8-11)
  no_sk_penetapan: string | null
  tanggal_penetapan: string | null
  status_penetapan: string | null
  catatan_penetapan: string | null
  
  // Dokumen (12-13)
  link_foto_pasfoto: string | null
  link_dokumen_pdf: string | null
  
  // Periode & Timestamps
  periode_pemberian: string | null
  created_at: string
  updated_at?: string | null
  
  // Joined data
  profiles?: {
    email: string | null
  }
}

// Items per page
const ITEMS_PER_PAGE = 9

export default function DataPenetapanPage() {
  const supabase = createClient()

  // Data state
  const [penerimaData, setPenerimaData] = useState<PenerimaData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [jenjangFilter, setJenjangFilter] = useState<string>('all')
  const [unitFilter, setUnitFilter] = useState<string>('all')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    byJenjang: {} as Record<string, number>,
    byUnit: {} as Record<string, number>
  })

  // Fetch accepted data from Supabase - matching Excel data_penetapan structure
  const fetchPenerimaData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch from penetapan table with profile join
      const { data, error: fetchError } = await supabase
        .from('penetapan')
        .select(`
          *,
          profiles (
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (fetchError) throw fetchError

      setPenerimaData(data || [])

      // Calculate stats
      const total = data?.length || 0
      const byJenjang: Record<string, number> = {}
      const byUnit: Record<string, number> = {}
      
      data?.forEach(item => {
        // Count by jenjang pendidikan
        byJenjang[item.jenjang_pendidikan] = (byJenjang[item.jenjang_pendidikan] || 0) + 1
        
        // Count by unit pemanfaatan
        byUnit[item.unit_tujuan_pemanfaatan] = (byUnit[item.unit_tujuan_pemanfaatan] || 0) + 1
      })

      setStats({ total, byJenjang, byUnit })

    } catch (err: unknown) {
      console.error('Error fetching penerima data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data penerima beasiswa'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPenerimaData()
  }, [])

  // Filtered data
  const filteredData = useMemo(() => {
    let result = [...penerimaData]

    // Apply search filter across multiple fields from Excel
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.nama_lengkap?.toLowerCase().includes(query) ||
        item.nik?.includes(query) ||
        item.no_sk_penetapan?.toLowerCase().includes(query) ||
        item.jurusan_tujuan?.toLowerCase().includes(query) ||
        item.unit_tujuan_pemanfaatan?.toLowerCase().includes(query) ||
        item.email?.toLowerCase().includes(query)
      )
    }

    // Apply jenjang filter
    if (jenjangFilter !== 'all') {
      result = result.filter(item => item.jenjang_pendidikan === jenjangFilter)
    }

    // Apply unit filter
    if (unitFilter !== 'all') {
      result = result.filter(item => item.unit_tujuan_pemanfaatan === unitFilter)
    }

    return result
  }, [penerimaData, searchQuery, jenjangFilter, unitFilter])

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredData, currentPage])

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)

  // Unique values for filters
  const uniqueJenjang = useMemo(() => {
    const jenjangs = new Set(penerimaData.map(item => item.jenjang_pendidikan))
    return Array.from(jenjangs).sort()
  }, [penerimaData])

  const uniqueUnits = useMemo(() => {
    const units = new Set(penerimaData.map(item => item.unit_tujuan_pemanfaatan))
    return Array.from(units).sort()
  }, [penerimaData])

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Generate SK number (use existing or generate placeholder)
  const getSKNumber = (item: PenerimaData) => {
    if (item.no_sk_penetapan) return item.no_sk_penetapan
    
    // Generate placeholder if not exists
    const year = item.periode_pemberian || new Date(item.created_at).getFullYear()
    const index = penerimaData.findIndex(d => d.id === item.id) + 1
    return `SK/BKS/${year}/${String(index).padStart(4, '0')}*`
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <CheckSquare className="w-6 h-6 text-green-600" />
            </div>
            Data Penetapan
          </h1>
          <p className="text-gray-500 mt-2">Daftar penerima beasiswa yang telah ditetapkan secara resmi</p>
        </div>
        
        <button 
          onClick={() => window.print()}
          className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm w-fit flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Cetak SK
        </button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Penerima */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <Award className="w-8 h-8 text-white/80" />
            <span className="px-2 py-0.5 bg-white/20 text-xs font-medium rounded-full">{new Date().getFullYear()}</span>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-sm text-green-100 mt-1">Penerima Aktif</p>
        </div>

        {/* Top Jenjang Pendidikan */}
        {Object.entries(stats.byJenjang).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([jenjang, count], index) => (
          <div key={jenjang} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                index === 0 ? 'bg-purple-100' : index === 1 ? 'bg-blue-100' : 'bg-orange-100'
              }`}>
                <GraduationCap className={`w-3 h-3 ${
                  index === 0 ? 'text-purple-600' : index === 1 ? 'text-blue-600' : 'text-orange-600'
                }`} />
              </div>
              <span className="text-sm text-gray-500 line-clamp-1">{jenjang}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{count}</p>
            <p className="text-xs text-gray-500 mt-1">Penerima</p>
          </div>
        ))}

        {/* Fill empty slots */}
        {Object.keys(stats.byJenjang).length < 3 && Array.from({ length: 3 - Object.keys(stats.byJenjang).length }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-gray-300" />
              <span className="text-sm text-gray-400">Program Lainnya</span>
            </div>
            <p className="text-2xl font-bold text-gray-300">0</p>
            <p className="text-xs text-gray-400 mt-1">Penerima</p>
          </div>
        ))}
      </div>

      {/* Announcement banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/50 p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Penetapan Terbaru
            </h3>
            <p className="text-sm text-gray-600">
              {stats.total > 0 
                ? `Terdapat ${stats.total} penerima beasiswa yang telah ditetapkan oleh Pemkab Kutai Kartanegara.`
                : 'Belum ada penetapan penerima beasiswa.'
              }
            </p>
          </div>
          <div className="px-4 py-2 bg-white text-emerald-700 font-medium rounded-lg border border-emerald-200 whitespace-nowrap text-sm">
            Periode {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Cari nama penerima, NIK, nomor SK, atau jurusan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          
          <select 
            value={jenjangFilter}
            onChange={(e) => {
              setJenjangFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white min-w-[180px]"
          >
            <option value="">Semua Jenjang</option>
            {uniqueJenjang.map((jenjang) => (
              <option key={jenjang} value={jenjang}>{jenjang}</option>
            ))}
          </select>

          <select 
            value={unitFilter}
            onChange={(e) => {
              setUnitFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white min-w-[220px]"
          >
            <option value="">Semua Unit Tujuan</option>
            {uniqueUnits.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Terjadi Kesalahan</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <button
              onClick={fetchPenerimaData}
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Memuat data penerima...</p>
          <p className="text-sm text-gray-400 mt-1">Mohon tunggu sebentar</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredData.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Penerima</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchQuery || jenjangFilter || unitFilter
              ? 'Tidak ada data penerima yang sesuai dengan pencarian Anda.'
              : 'Belum ada pengajuan yang ditetapkan sebagai penerima beasiswa. Data akan muncul setelah admin menyetujui pengajuan di Panel Admin.'
            }
          </p>
        </div>
      )}

      {/* Recipients list */}
      {!loading && filteredData.length > 0 && (
        <>
          {/* Card header info */}
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-gray-500">
              Menampilkan <span className="font-medium text-gray-700">{paginatedData.length}</span> dari{' '}
              <span className="font-medium text-gray-700">{filteredData.length}</span> penerima aktif
            </p>
          </div>

          {/* Recipient cards - showing all relevant fields from Excel */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedData.map((recipient) => (
              <article 
                key={recipient.id} 
                className="bg-white rounded-xl border border-green-200 p-5 hover:shadow-md transition-all duration-200 group"
              >
                {/* Header with photo and name */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Photo */}
                    {recipient.link_foto_pasfoto ? (
                      <img 
                        src={recipient.link_foto_pasfoto}
                        alt={recipient.nama_lengkap}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-green-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                        {(recipient.nama_lengkap || 'U').charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                        {recipient.nama_lengkap}
                      </h3>
                      <p className="text-xs text-gray-500">{recipient.jurusan_tujuan}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-[10px] font-bold rounded-full uppercase bg-green-100 text-green-700 border border-green-200">
                    Diterima
                  </span>
                </div>

                {/* Details - showing fields from Excel template */}
                <div className="space-y-2 mb-4">
                  {/* NIK */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-28 flex-shrink-0">NIK:</span>
                    <span className="font-mono text-gray-700">{recipient.nik}</span>
                  </div>
                  
                  {/* Jenjang Pendidikan */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-28 flex-shrink-0">Jenjang:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      recipient.jenjang_pendidikan.includes('Sp') ? 'bg-purple-100 text-purple-800' :
                      recipient.jenjang_pendidikan.includes('S2') || recipient.jenjang_pendidikan.includes('S3') ? 'bg-indigo-100 text-indigo-800' :
                      recipient.jenjang_pendidikan.includes('S1') ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {recipient.jenjang_pendidikan}
                    </span>
                  </div>
                  
                  {/* Unit Tujuan Pemanfaatan */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-28 flex-shrink-0">Unit Tujuan:</span>
                    <span className="text-gray-700 truncate" title={recipient.unit_tujuan_pemanfaatan}>
                      {recipient.unit_tujuan_pemanfaatan}
                    </span>
                  </div>
                  
                  {/* Tahun Studi */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-28 flex-shrink-0">Tahun Studi:</span>
                    <span className="font-medium text-gray-900">{recipient.rencana_tahun_studi}</span>
                  </div>
                  
                  {/* No SK Penetapan */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-28 flex-shrink-0">No. SK:</span>
                    <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                      recipient.no_sk_penetapan 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {getSKNumber(recipient)}
                    </span>
                  </div>
                  
                  {/* Tanggal Penetapan */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-28 flex-shrink-0">Tgl. Penetapan:</span>
                    <span className="text-gray-700">
                      {recipient.tanggal_penetapan 
                        ? formatDate(recipient.tanggal_penetapan) 
                        : '-'
                      }
                    </span>
                  </div>
                  
                  {/* Periode */}
                  {recipient.periode_pemberian && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-28 flex-shrink-0">Periode:</span>
                      <span className="text-gray-700">{recipient.periode_pemberian}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                    Detail
                  </button>
                  
                  {/* Link to document PDF */}
                  {recipient.link_dokumen_pdf && (
                    <a
                      href={recipient.link_dokumen_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Dokumen
                    </a>
                  )}
                  
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                    Unduh SK
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 || 
                  page === totalPages || 
                  Math.abs(page - currentPage) <= 1
                )
                .map((page, index, array) => (
                  <span key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage
                          ? 'bg-emerald-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Print-only footer */}
      <div className="hidden print:block text-center text-xs text-gray-500 pt-8 border-t">
        <p>Dokumen ini dicetak dari SIMBAKES - Sistem Informasi Beasiswa Kesehatan</p>
        <p>Pemerintah Kabupaten Kutai Kartanegara - {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
      </div>
    </div>
  )
}

