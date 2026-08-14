'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { toast } from 'sonner'
import {
  Shield,
  Users,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  FileText,
  Image,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  GraduationCap,
  Award,
  TrendingUp,
  UserCheck,
  UserX,
  RefreshCw,
  MapPin,
  Briefcase,
  Phone,
  Mail
} from 'lucide-react'

// Types based on Excel template data_pengusulan sheet (21 columns)
interface PengusulanData {
  id: string
  user_id: string
  nomor_pengajuan: string
  
  // Data Pribadi (from Excel columns)
  nik: string
  nama_lengkap: string
  tempat_lahir: string | null
  tanggal_lahir: string | null
  alamat_ktp: string
  alamat_domisili: string | null
  lama_domisili_tahun: number
  
  // Data Pekerjaan
  pekerjaan: string | null
  posisi_jabatan: string | null
  unit_kerja: string | null
  
  // Narasi
  penjelasan_narasi: string | null
  
  // Data Pendidikan Tujuan
  jurusan_tujuan: string
  jenjang_pendidikan: string
  unit_tujuan_pemanfaatan: string
  rencana_tahun_studi: number
  
  // Kontak
  no_hp: string
  no_whatsapp: string | null
  email: string
  
  // Status & Dokumen
  status: 'Sedang Diproses' | 'Diterima (Penetapan)' | 'Ditolak' | 'Ditarik'
  pasfoto: string | null
  dokumen_ktp: string | null
  dokumen_ktm: string | null
  dokumen_transkrip: string | null
  
  // Timestamps
  created_at: string
  updated_at?: string
  
  // Joined data from profiles
  profiles?: {
    nama_lengkap: string | null
    email: string | null
    nik: string | null
    role: string | null
  }
}

type SortField = 'nama_lengkap' | 'jurusan_tujuan' | 'jenjang_pendidikan' | 'status' | 'created_at' | 'nik'
type SortOrder = 'asc' | 'desc'

// Status configuration
const STATUS_CONFIG = {
  'Sedang Diproses': {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    label: 'Sedang Diproses',
    badge: 'warning'
  },
  'Diterima (Penetapan)': {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    label: 'Diterima',
    badge: 'success'
  },
  'Ditolak': {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    label: 'Ditolak',
    badge: 'danger'
  }
}

// Items per page
const ITEMS_PER_PAGE = 10

export default function AdminDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth()

  // Data state
  const [pengusulanData, setPengusulanData] = useState<PengusulanData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [selectedItem, setSelectedItem] = useState<PengusulanData | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [actionStatus, setActionStatus] = useState<'Diterima (Penetapan)' | 'Ditolak' | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [jenjangFilter, setJenjangFilter] = useState<string>('all')
  const [unitFilter, setUnitFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    diproses: 0,
    diterima: 0,
    ditolak: 0
  })

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        toast.error('Anda harus login untuk mengakses panel admin')
        router.push('/dashboard/login?redirect=/dashboard/admin')
        return
      }
      if (!isAdmin) {
        toast.error('Akses ditolak. Hanya Administrator yang dapat mengakses halaman ini.')
        router.push('/dashboard/denied')
        return
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, router])

  // Fetch data from Supabase with all fields from Excel template
  const fetchPengusulanData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('pengusulan')
        .select(`
          *,
          profiles (
            nama_lengkap,
            email,
            nik,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (fetchError) throw fetchError

      setPengusulanData(data || [])

      // Calculate stats
      const total = data?.length || 0
      const diproses = data?.filter(item => item.status === 'Sedang Diproses').length || 0
      const diterima = data?.filter(item => item.status === 'Diterima (Penetapan)').length || 0
      const ditolak = data?.filter(item => item.status === 'Ditolak').length || 0

      setStats({ total, diproses, diterima, ditolak })

    } catch (err: unknown) {
      console.error('Error fetching pengusulan data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data pengusulan'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (isAdmin && isAuthenticated) {
      fetchPengusulanData()
    }
  }, [isAdmin, isAuthenticated, fetchPengusulanData])

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...pengusulanData]

    // Apply search filter - search across multiple fields from Excel
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.nama_lengkap?.toLowerCase().includes(query) ||
        item.nomor_pengajuan.toLowerCase().includes(query) ||
        item.nik?.includes(query) ||
        item.jurusan_tujuan?.toLowerCase().includes(query) ||
        item.unit_tujuan_pemanfaatan?.toLowerCase().includes(query) ||
        item.email?.toLowerCase().includes(query) ||
        item.no_hp?.includes(query) ||
        item.alamat_ktp?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter)
    }

    // Apply jenjang pendidikan filter
    if (jenjangFilter !== 'all') {
      result = result.filter(item => item.jenjang_pendidikan === jenjangFilter)
    }

    // Apply unit filter
    if (unitFilter !== 'all') {
      result = result.filter(item => item.unit_tujuan_pemanfaatan === unitFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'nama_lengkap':
          comparison = (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '')
          break
        case 'nik':
          comparison = (a.nik || '').localeCompare(b.nik || '')
          break
        case 'jurusan_tujuan':
          comparison = a.jurusan_tujuan.localeCompare(b.jurusan_tujuan)
          break
        case 'jenjang_pendidikan':
          comparison = a.jenjang_pendidikan.localeCompare(b.jenjang_pendidikan)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [pengusulanData, searchQuery, statusFilter, jenjangFilter, unitFilter, sortField, sortOrder])

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredData, currentPage])

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)

  // Unique values for filters
  const uniqueJenjang = useMemo(() => {
    const jenjangs = new Set(pengusulanData.map(item => item.jenjang_pendidikan))
    return Array.from(jenjangs).sort()
  }, [pengusulanData])

  const uniqueUnits = useMemo(() => {
    const units = new Set(pengusulanData.map(item => item.unit_tujuan_pemanfaatan))
    return Array.from(units).sort()
  }, [pengusulanData])

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedItem || !actionStatus) return

    setIsUpdating(true)
    try {
      const { error: updateError } = await supabase
        .from('pengusulan')
        .update({ 
          status: actionStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedItem.id)

      if (updateError) throw updateError

      toast.success(`Status berhasil diubah menjadi "${actionStatus}"`)
      
      // Refresh data
      await fetchPengusulanData()
      
      // Close modals
      setShowConfirmModal(false)
      setShowDetailModal(false)
      setSelectedItem(null)
      setActionStatus(null)

    } catch (err: unknown) {
      console.error('Error updating status:', err)
      const errorMessage = err instanceof Error ? err.message : 'Gagal mengubah status'
      toast.error(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  // Open detail modal
  const openDetailModal = (item: PengusulanData) => {
    setSelectedItem(item)
    setShowDetailModal(true)
  }

  // Open confirm modal for status change
  const openConfirmModal = (status: 'Diterima (Penetapan)' | 'Ditolak') => {
    setActionStatus(status)
    setShowConfirmModal(true)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format date only
  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Memverifikasi hak akses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg shadow-red-500/25">
              <Shield className="w-7 h-7 text-white" />
            </div>
            Panel Admin
          </h1>
          <p className="text-gray-500 mt-2 ml-14">
            Kelola pengajuan beasiswa kesehatan Pemkab Kutai Kartanegara
          </p>
        </div>

        <button
          onClick={fetchPengusulanData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 text-white/80" />
            <span className="px-2 py-0.5 bg-white/20 text-xs font-medium rounded-full">Total</span>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-sm text-blue-100 mt-1">Total Pengajuan</p>
        </div>

        <div className="bg-white rounded-xl border border-yellow-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <span className="px-2 py-0.5 bg-yellow-100 text-xs font-medium text-yellow-700 rounded-full">Proses</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.diproses}</p>
          <p className="text-sm text-gray-500 mt-1">Sedang Diproses</p>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <UserCheck className="w-8 h-8 text-green-500" />
            <span className="px-2 py-0.5 bg-green-100 text-xs font-medium text-green-700 rounded-full">Diterima</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.diterima}</p>
          <p className="text-sm text-gray-500 mt-1">Diterima (Penetapan)</p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <UserX className="w-8 h-8 text-red-500" />
            <span className="px-2 py-0.5 bg-red-100 text-xs font-medium text-red-700 rounded-full">Ditolak</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.ditolak}</p>
          <p className="text-sm text-gray-500 mt-1">Ditolak</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, NIK, nomor pengajuan, jurusan, unit..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white min-w-[160px]"
          >
            <option value="all">Semua Status</option>
            <option value="Sedang Diproses">Sedang Diproses</option>
            <option value="Diterima (Penetapan)">Diterima</option>
            <option value="Ditolak">Ditolak</option>
          </select>

          {/* Jenjang Filter */}
          <select
            value={jenjangFilter}
            onChange={(e) => {
              setJenjangFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white min-w-[160px]"
          >
            <option value="all">Semua Jenjang</option>
            {uniqueJenjang.map((jenjang) => (
              <option key={jenjang} value={jenjang}>{jenjang}</option>
            ))}
          </select>

          {/* Unit Filter */}
          <select
            value={unitFilter}
            onChange={(e) => {
              setUnitFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white min-w-[200px]"
          >
            <option value="all">Semua Unit</option>
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
              onClick={fetchPengusulanData}
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header Info */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Menampilkan <span className="font-semibold text-gray-900">{paginatedData.length}</span> dari{' '}
            <span className="font-semibold text-gray-900">{filteredData.length}</span> pengajuan
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Memuat data pengusulan...</p>
            <p className="text-sm text-gray-400 mt-1">Mohon tunggu sebentar</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredData.length === 0 && !error && (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Data</h3>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== 'all' || jenjangFilter !== 'all' || unitFilter !== 'all'
                ? 'Tidak ada data yang sesuai dengan filter yang dipilih.'
                : 'Belum ada pengajuan beasiswa masuk.'
              }
            </p>
          </div>
        )}

        {/* Table Content */}
        {!loading && filteredData.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('nama_lengkap')}
                    >
                      <div className="flex items-center gap-1">
                        Nama
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('nik')}
                    >
                      <div className="flex items-center gap-1">
                        NIK
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('jurusan_tujuan')}
                    >
                      <div className="flex items-center gap-1">
                        Jurusan Tujuan
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('jenjang_pendidikan')}
                    >
                      <div className="flex items-center gap-1">
                        Jenjang
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Unit Tujuan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tahun Studi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Kontak
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        Tanggal
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedData.map((item) => {
                    const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG]
                    const StatusIcon = statusConfig.icon
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        {/* Nama */}
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.nama_lengkap}
                            </p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                              {item.nomor_pengajuan}
                            </p>
                          </div>
                        </td>

                        {/* NIK */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm text-gray-700">
                            {item.nik}
                          </span>
                        </td>

                        {/* Jurusan Tujuan */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <GraduationCap className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate" title={item.jurusan_tujuan}>
                              {item.jurusan_tujuan}
                            </span>
                          </div>
                        </td>

                        {/* Jenjang Pendidikan */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            item.jenjang_pendidikan.includes('Sp') ? 'bg-purple-100 text-purple-800' :
                            item.jenjang_pendidikan.includes('S2') || item.jenjang_pendidikan.includes('S3') ? 'bg-indigo-100 text-indigo-800' :
                            item.jenjang_pendidikan.includes('S1') ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.jenjang_pendidikan}
                          </span>
                        </td>

                        {/* Unit Tujuan */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 max-w-[180px]">
                            <Briefcase className="w-4 h-4 text-teal-500 flex-shrink-0" />
                            <span className="text-sm text-gray-600 truncate" title={item.unit_tujuan_pemanfaatan}>
                              {item.unit_tujuan_pemanfaatan}
                            </span>
                          </div>
                        </td>

                        {/* Tahun Studi */}
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-gray-900">
                            {item.rencana_tahun_studi}
                          </span>
                        </td>

                        {/* Kontak */}
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              <span>{item.no_hp}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 truncate max-w-[150px]">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span>{item.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-500 whitespace-nowrap">
                            {formatDateOnly(item.created_at)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openDetailModal(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {item.status !== 'Diterima (Penetapan)' && (
                              <button
                                onClick={() => {
                                  setSelectedItem(item)
                                  openConfirmModal('Diterima (Penetapan)')
                                }}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Terima Pengajuan"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}

                            {item.status !== 'Ditolak' && (
                              <button
                                onClick={() => {
                                  setSelectedItem(item)
                                  openConfirmModal('Ditolak')
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Tolak Pengajuan"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Halaman {currentPage} dari {totalPages}
                </p>
                <div className="flex items-center gap-2">
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
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal - Shows all 21 fields from Excel */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDetailModal(false)}
          />

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Detail Pengajuan Beasiswa</h2>
                    <p className="text-emerald-100 text-sm mt-0.5">
                      {selectedItem.nomor_pengajuan}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
                
                {/* Section 1: Data Pribadi */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Data Pribadi
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Nama Lengkap</label>
                      <p className="font-medium text-gray-900 mt-1">{selectedItem.nama_lengkap}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">NIK</label>
                      <p className="font-mono text-gray-900 mt-1">{selectedItem.nik}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Tempat Lahir</label>
                      <p className="text-gray-900 mt-1">{selectedItem.tempat_lahir || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Tanggal Lahir</label>
                      <p className="text-gray-900 mt-1">{selectedItem.tanggal_lahir ? formatDateOnly(selectedItem.tanggal_lahir) : '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Alamat KTP</label>
                      <p className="text-gray-900 mt-1">{selectedItem.alamat_ktp}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Alamat Domisili</label>
                      <p className="text-gray-900 mt-1">{selectedItem.alamat_domisili || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Lama Domisili</label>
                      <p className="text-gray-900 mt-1">{selectedItem.lama_domisili_tahun} tahun</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Data Pekerjaan */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-orange-500" />
                    Data Pekerjaan
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Pekerjaan</label>
                      <p className="text-gray-900 mt-1">{selectedItem.pekerjaan || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Posisi/Jabatan</label>
                      <p className="text-gray-900 mt-1">{selectedItem.posisi_jabatan || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Unit Kerja</label>
                      <p className="text-gray-900 mt-1">{selectedItem.unit_kerja || '-'}</p>
                    </div>
                  </div>
                  
                  {selectedItem.penjelasan_narasi && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Penjelasan/Narasi</label>
                      <p className="text-gray-900 mt-1 whitespace-pre-wrap">{selectedItem.penjelasan_narasi}</p>
                    </div>
                  )}
                </div>

                {/* Section 3: Data Pendidikan Tujuan */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-500" />
                    Data Pendidikan Tujuan
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Jurusan / Program Studi</label>
                      <p className="font-medium text-gray-900 mt-1">{selectedItem.jurusan_tujuan}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Jenjang Pendidikan</label>
                      <p className="text-gray-900 mt-1">{selectedItem.jenjang_pendidikan}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Unit Tujuan Pemanfaatan</label>
                      <p className="text-gray-900 mt-1">{selectedItem.unit_tujuan_pemanfaatan}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Rencana Tahun Mulai Studi</label>
                      <p className="text-gray-900 mt-1">{selectedItem.rencana_tahun_studi}</p>
                    </div>
                  </div>
                </div>

                {/* Section 4: Kontak */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-teal-500" />
                    Informasi Kontak
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Nomor HP</label>
                      <p className="text-gray-900 mt-1">{selectedItem.no_hp}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Nomor WhatsApp</label>
                      <p className="text-gray-900 mt-1">{selectedItem.no_whatsapp || selectedItem.no_hp}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Email</label>
                      <p className="text-gray-900 mt-1">{selectedItem.email}</p>
                    </div>
                  </div>
                </div>

                {/* Section 5: Dokumen */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-rose-500" />
                    Dokumen yang Diunggah
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Pas Foto */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Image className="w-5 h-5 text-pink-500" />
                        <span className="font-medium text-sm text-gray-700">Pas Foto</span>
                      </div>
                      {selectedItem.pasfoto ? (
                        <img 
                          src={selectedItem.pasfoto} 
                          alt="Pas Foto" 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <p className="text-sm text-gray-400 italic">Tidak ada</p>
                      )}
                    </div>

                    {/* KTP */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-sm text-gray-700">Scan KTP</span>
                      </div>
                      {selectedItem.dokumen_ktp ? (
                        <a
                          href={selectedItem.dokumen_ktp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat Dokumen
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Tidak ada</p>
                      )}
                    </div>

                    {/* KTM/Ijazah */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <span className="font-medium text-sm text-gray-700">KTM/Ijazah</span>
                      </div>
                      {selectedItem.dokumen_ktm ? (
                        <a
                          href={selectedItem.dokumen_ktm}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat Dokumen
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Tidak ada</p>
                      )}
                    </div>

                    {/* Transkrip Nilai */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-green-500" />
                        <span className="font-medium text-sm text-gray-700">Transkrip Nilai</span>
                      </div>
                      {selectedItem.dokumen_transkrip ? (
                        <a
                          href={selectedItem.dokumen_transkrip}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat Dokumen
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Tidak ada</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 6: Status & Timeline */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Status & Riwayat
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status Saat Ini:</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        STATUS_CONFIG[selectedItem.status as keyof typeof STATUS_CONFIG].color
                      }`}>
                        {(() => {
                          const Icon = STATUS_CONFIG[selectedItem.status as keyof typeof STATUS_CONFIG].icon
                          return <Icon className="w-3.5 h-3.5" />
                        })()}
                        {selectedItem.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Tanggal Pengajuan:</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedItem.created_at)}</span>
                    </div>
                    
                    {selectedItem.updated_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Terakhir Diperbarui:</span>
                        <span className="font-medium text-gray-900">{formatDate(selectedItem.updated_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Tutup
                </button>

                {selectedItem.status === 'Sedang Diproses' && (
                  <>
                    <button
                      onClick={() => openConfirmModal('Ditolak')}
                      className="px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Tolak
                    </button>
                    <button
                      onClick={() => openConfirmModal('Diterima (Penetapan)')}
                      className="px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Terima
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {showConfirmModal && selectedItem && actionStatus && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(false)}
          />

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                actionStatus === 'Diterima (Penetapan)' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {actionStatus === 'Diterima (Penetapan)' ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Konfirmasi {actionStatus === 'Diterima (Penetapan)' ? 'Penerimaan' : 'Penolakan'}
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                Apakah Anda yakin ingin mengubah status pengajuan{' '}
                <span className="font-semibold text-gray-900">{selectedItem.nama_lengkap}</span>{' '}
                menjadi <span className={`font-semibold ${
                  actionStatus === 'Diterima (Penetapan)' ? 'text-green-600' : 'text-red-600'
                }`}> "{actionStatus}"</span>?
              </p>

              {actionStatus === 'Diterima (Penetapan)' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-green-700 flex items-start gap-2">
                    <Award className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Data ini akan otomatis muncul di halaman "Data Penetapan" publik.</span>
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating}
                  className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                    actionStatus === 'Diterima (Penetapan)'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : actionStatus === 'Diterima (Penetapan)' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Ya, Terima
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Ya, Tolak
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
