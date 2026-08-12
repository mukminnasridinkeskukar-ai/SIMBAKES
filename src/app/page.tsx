'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  GraduationCap, 
  Heart, 
  Users, 
  FileText, 
  Map, 
  ClipboardList,
  Database,
  ShieldCheck,
  Menu,
  X,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  BookOpen,
  HelpCircle,
  Info,
  HeadphonesIcon,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface RoadmapItem {
  id: string
  kode: string
  jurusan: string
  kualifikasi_awal: string
  jenis_pendidikan: string
  perguruan_tinggi: string
  pekerjaan: string
  tahun_mulai_studi: number | null
  unit_pendayaguna: string
  status: string
  nama_penerima: string | null
}

interface PengusulanItem {
  id: string
  nik: string
  nama_lengkap: string
  tempat_lahir: string
  tanggal_lahir: string
  alamat_ktp: string
  alamat_domisili: string
  lama_domisili_tahun: number | null
  pekerjaan: string
  posisi_jabatan: string
  unit_kerja: string
  penjelasan_narasi: string
  jurusan_tujuan: string
  jenjang_pendidikan: string
  unit_tujuan_pemanfaatan: string
  rencana_tahun_studi: number | null
  no_hp: string
  no_whatsapp: string
  email: string
  status: string
  pasfoto: string
  dokumen: string
}

interface PenetapanItem {
  id: string
  nik: string
  nama_lengkap: string
  jurusan_tujuan: string
  jenjang_pendidikan: string
  unit_tujuan_pemanfaatan: string
  rencana_tahun_studi: number | null
  no_sk_penetapan: string
  tanggal_penetapan: string
  status_penetapan: string
  catatan_penetapan: string
  link_foto_pasfoto: string
  link_dokumen_pdf: string
  periode_pemberian: string
}

interface User {
  id: string
  nama_lengkap: string
  username: string
  email: string
  role: string
  status: string
}

interface InformasiItem {
  id: string
  judul: string
  isi: string
  kategori: string
  status: string
}

interface CSItem {
  id: string
  nama_lengkap: string
  jabatan: string
  no_hp: string
  no_whatsapp: string
  email: string
  jam_operasional: string
  urutan: number
}

// =====================================================
// MOCK DATA (Simulating Supabase data)
// =====================================================

const mockRoadmapData: RoadmapItem[] = [
  { id: '1', kode: 'RM-001', jurusan: 'Kedokteran Umum', kualifikasi_awal: 'Sarjana Kedokteran', jenis_pendidikan: 'Profesi', perguruan_tinggi: 'Universitas Indonesia', pekerjaan: 'Dokter PTT', tahun_mulai_studi: 2025, unit_pendayaguna: 'Dinas Kesehatan', status: 'tersedia', nama_penerima: null },
  { id: '2', kode: 'RM-002', jurusan: 'Keperawatan', kualifikasi_awal: 'D3/S1 Keperawatan', jenis_pendidikan: 'S1/S2', perguruan_tinggi: 'Universitas Airlangga', pekerjaan: 'Perawat RS', tahun_mulai_studi: 2025, unit_pendayaguna: 'RSUD Provinsi', status: 'tersedia', nama_penerima: null },
  { id: '3', kode: 'RM-003', jurusan: 'Kebidanan', kualifikasi_awal: 'D3 Kebidanan', jenis_pendidikan: 'S1', perguruan_tinggi: 'Universitas Gadjah Mada', pekerjaan: 'Bidan Desa', tahun_mulai_studi: 2025, unit_pendayaguna: 'Puskesmas', status: 'tersedia', nama_penerima: null },
  { id: '4', kode: 'RM-004', jurusan: 'Farmasi', kualifikasi_awal: 'S1 Farmasi', jenis_pendidikan: 'S2/S3', perguruan_tinggi: 'Institut Teknologi Bandung', pekerjaan: 'Farmasis', tahun_mulai_studi: 2026, unit_pendayaguna: 'Instalasi Farmasi', status: 'tersedia', nama_penerima: null },
  { id: '5', kode: 'RM-005', jurusan: 'Kesehatan Masyarakat', kualifikasi_awal: 'S1 KESMAS', jenis_pendidikan: 'S2/S3', perguruan_tinggi: 'Universitas Hasanuddin', pekerjaan: 'Epidemiolog', tahun_mulai_studi: 2026, unit_pendayaguna: 'Dinkes Provinsi', status: 'dipenuhi', nama_penerima: 'Dr. Budi Santoso' },
]

const mockPengusulanData: PengusulanItem[] = [
  { id: '1', nik: '3201010101010001', nama_lengkap: 'Dr. Siti Nurhaliza', tempat_lahir: 'Jakarta', tanggal_lahir: '1990-05-15', alamat_ktp: 'Jl. Merdeka No. 10', alamat_domisili: 'Jl. Sudirman No. 25', lama_domisili_tahun: 5, pekerjaan: 'Dokter', posisi_jabatan: 'Dokter PTT', unit_kerja: 'Puskesmas Central', penjelasan_narasi: 'Ingin melanjutkan spesialisasi', jurusan_tujuan: 'Spesialis Anak', jenjang_pendidikan: 'Spesialis', unit_tujuan_pemanfaatan: 'RSUD Provinsi', rencana_tahun_studi: 2025, no_hp: '081234567890', no_whatsapp: '081234567890', email: 'siti@email.com', status: 'diterima', pasfoto: '', dokumen: '' },
  { id: '2', nik: '3202010202020002', nama_lengkap: 'Ahmad Fauzi, S.Km', tempat_lahir: 'Bandung', tanggal_lahir: '1992-08-20', alamat_ktp: 'Jl. Asia Afrika No. 5', alamat_domisili: 'Jl. Braga No. 15', lama_domisili_tahun: 3, pekerjaan: 'Sanitarian', posisi_jabatan: 'Staff Dinkes', unit_kerja: 'Dinas Kesehatan', penjelasan_narasi: 'Pengembangan kompetensi', jurusan_tujuan: 'Magister Kesehatan Masyarakat', jenjang_pendidikan: 'S2', unit_tujuan_pemanfaatan: 'Dinkes Provinsi', rencana_tahun_studi: 2025, no_hp: '082345678901', no_whatsapp: '082345678901', email: 'ahmad@email.com', status: 'ditinjau', pasfoto: '', dokumen: '' },
  { id: '3', nik: '3203030303030003', nama_lengkap: 'Rina Marlina, A.Md', tempat_lahir: 'Surabaya', tanggal_lahir: '1995-12-10', alamat_ktp: 'Jl. Tunjungan No. 8', alamat_domisili: 'Jl. Basuki Rachmat No. 12', lama_domisili_tahun: 2, pekerjaan: 'Bidan', posisi_jabatan: 'Bidan Desa', unit_kerja: 'Puskesmas Desa', penjelasan_narasi: 'Meningkatkan kualifikasi', jurusan_tujuan: 'S1 Kebidanan', jenjang_pendidikan: 'S1', unit_tujuan_pemanfaatan: 'Puskesmas', rencana_tahun_studi: 2026, no_hp: '083456789012', no_whatsapp: '083456789012', email: 'rina@email.com', status: 'diajukan', pasfoto: '', dokumen: '' },
]

const mockPenetapanData: PenetapanItem[] = [
  { id: '1', nik: '3201010101010001', nama_lengkap: 'Dr. Siti Nurhaliza', jurusan_tujuan: 'Spesialis Anak', jenjang_pendidikan: 'Spesialis', unit_tujuan_pemanfaatan: 'RSUD Provinsi', rencana_tahun_studi: 2025, no_sk_penetapan: 'SK/001/SIMBAKES/2025', tanggal_penetapan: '2025-01-15', status_penetapan: 'ditetapkan', catatan_penetapan: 'Memenuhi semua persyaratan', link_foto_pasfoto: '', link_dokumen_pdf: '', periode_pemberian: '2025-2028' },
  { id: '2', nik: '3204040404040004', nama_lengkap: 'Dr. Budi Santoso', jurusan_tujuan: 'Magister Kesehatan Masyarakat', jenjang_pendidikan: 'S2', unit_tujuan_pemanfaatan: 'Dinkes Provinsi', rencana_tahun_studi: 2026, no_sk_penetapan: 'SK/002/SIMBAKES/2025', tanggal_penetapan: '2025-01-20', status_penetapan: 'ditetapkan', catatan_penetapan: 'Prioritas epidemiolog', link_foto_pasfoto: '', link_dokumen_pdf: '', periode_pemberian: '2026-2028' },
]

const mockUsers: User[] = [
  { id: '1', nama_lengkap: 'Administrator', username: 'admin', email: 'admin@simbakes.id', role: 'superadmin', status: 'aktif' },
  { id: '2', nama_lengkap: 'Operator Dinkes', username: 'operator', email: 'operator@simbakes.id', role: 'admin', status: 'aktif' },
  { id: '3', nama_lengkap: 'Viewer RSUD', username: 'viewer', email: 'viewer@simbakes.id', role: 'viewer', status: 'aktif' },
]

const mockInformasi: InformasiItem[] = [
  { id: '1', judul: 'Selamat Datang di SIMBAKES', isi: 'SIMBAKES (Beasiswa Tematik Bidang Kesehatan) adalah program beasiswa dari pemerintah untuk meningkatkan sumber daya manusia di bidang kesehatan Indonesia.', kategori: 'pengumuman', status: 'aktif' },
  { id: '2', judul: 'Pendaftaran Periode 2025-2026 Dibuka', isi: 'Pendaftaran beasiswa SIMBAKES untuk periode 2025-2026 telah dibuka. Silakan mengisi formulir pengusulan melalui menu yang tersedia di platform ini.', kategori: 'pengumuman', status: 'aktif' },
  { id: '3', judul: 'Cara Mengajukan Beasiswa', isi: 'Langkah-langkah mengajukan beasiswa:\n1. Daftar akun atau login\n2. Isi formulir pengusulan dengan lengkap\n3. Upload dokumen pendukung (KTP, ijazah, surat rekomendasi)\n4. Tunggu proses verifikasi oleh admin\n5. Cek status pengusulan secara berkala\n6. Jika diterima, tunggu SK penetapan', kategori: 'panduan', status: 'aktif' },
  { id: '4', judul: 'Persyaratan Umum', isi: '- Warga Negara Indonesia\n- Usia maksimal 35 tahun\n- Memiliki NIP/NIK yang valid\n- Belum pernah menerima beasiswa serupa\n- Bersedia mengikuti ikat dinas minimal 2x masa studi\n- Sehat jasmani dan rohani', kategori: 'panduan', status: 'aktif' },
  { id: '5', judul: 'FAQ - Pertanyaan Umum', isi: 'Q: Apakah boleh mendaftar lebih dari satu jurusan?\nA: Ya, namun hanya satu yang dapat dipilih.\n\nQ: Bagaimana jika data berubah setelah submit?\nA: Hubungi admin untuk perubahan data.\n\nQ: Kapan pengumuman hasil?\nA: Pengumuman dilakukan setiap akhir bulan.', kategori: 'faq', status: 'aktif' },
]

const mockCS: CSItem[] = [
  { id: '1', nama_lengkap: 'Dr. Siti Nurhaliza', jabatan: 'Koordinator SIMBAKES', no_hp: '081234567890', no_whatsapp: '6281234567890', email: 'siti@simbakes.id', jam_operasional: 'Senin-Jumat, 08:00-16:00 WIB', urutan: 1 },
  { id: '2', nama_lengkap: 'Ahmad Fauzi, S.Km', jabatan: 'Admin Layanan', no_hp: '082345678901', no_whatsapp: '6282345678901', email: 'ahmad@simbakes.id', jam_operasional: 'Senin-Jumat, 08:00-16:00 WIB', urutan: 2 },
  { id: '3', nama_lengkap: 'Rina Marlina, A.Md', jabatan: 'Staff Pendukung', no_hp: '083456789012', no_whatsapp: '6283456789012', email: 'rina@simbakes.id', jam_operasional: 'Senin-Kamis, 09:00-15:00 WIB', urutan: 3 },
]

// =====================================================
// MAIN APPLICATION COMPONENT
// =====================================================

export default function SIMBAKESPlatform() {
  // State Management
  const [showSplash, setShowSplash] = useState(true)
  const [splashProgress, setSplashProgress] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Data States
  const [roadmapData, setRoadmapData] = useState<RoadmapItem[]>(mockRoadmapData)
  const [pengusulanData, setPengusulanData] = useState<PengusulanItem[]>(mockPengusulanData)
  const [penetapanData, setPenetapanData] = useState<PenetapanItem[]>(mockPenetapanData)
  const [usersData, setUsersData] = useState<User[]>(mockUsers)
  const [informasiData, setInformasiData] = useState<InformasiItem[]>(mockInformasi)
  const [csData, setCsData] = useState<CSItem[]>(mockCS)

  // Form States
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Splash Screen Effect
  useEffect(() => {
    if (showSplash) {
      const interval = setInterval(() => {
        setSplashProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setTimeout(() => setShowSplash(false), 300)
            return 100
          }
          return prev + 2
        })
      }, 60)
      return () => clearInterval(interval)
    }
  }, [showSplash])

  // Login Handler
  const handleLogin = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      const user = usersData.find(u => u.username === loginForm.username && u.password === loginForm.password || (loginForm.username === 'admin' && loginForm.password === 'admin123'))
      if (user || (loginForm.username === 'admin' && loginForm.password === 'admin123')) {
        setCurrentUser(user || { id: '1', nama_lengkap: 'Administrator', username: 'admin', email: 'admin@simbakes.id', role: 'superadmin', status: 'aktif' })
        setIsLoggedIn(true)
        setShowLoginDialog(false)
        setLoginForm({ username: '', password: '' })
      } else {
        alert('Username atau password salah!')
      }
      setIsLoading(false)
    }, 500)
  }, [loginForm, usersData])

  // Logout Handler
  const handleLogout = useCallback(() => {
    setIsLoggedIn(false)
    setCurrentUser(null)
    setActiveTab('dashboard')
  }, [])

  // CRUD Operations for Roadmap
  const handleAddRoadmap = (data: Partial<RoadmapItem>) => {
    const newItem: RoadmapItem = {
      id: Date.now().toString(),
      kode: `RM-${String(roadmapData.length + 1).padStart(3, '0')}`,
      jurusan: data.jurusan || '',
      kualifikasi_awal: data.kualifikasi_awal || '',
      jenis_pendidikan: data.jenis_pendidikan || '',
      perguruan_tinggi: data.perguruan_tinggi || '',
      pekerjaan: data.pekerjaan || '',
      tahun_mulai_studi: data.tahun_mulai_studi || null,
      unit_pendayaguna: data.unit_pendayaguna || '',
      status: data.status || 'tersedia',
      nama_penerima: null
    }
    setRoadmapData([...roadmapData, newItem])
  }

  const handleUpdateRoadmap = (id: string, data: Partial<RoadmapItem>) => {
    setRoadmapData(roadmapData.map(item => item.id === id ? { ...item, ...data } : item))
  }

  const handleDeleteRoadmap = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      setRoadmapData(roadmapData.filter(item => item.id !== id))
    }
  }

  // CRUD Operations for Pengusulan
  const handleAddPengusulan = (data: Partial<PengusulanItem>) => {
    const newItem: PengusulanItem = {
      id: Date.now().toString(),
      nik: data.nik || '',
      nama_lengkap: data.nama_lengkap || '',
      tempat_lahir: data.tempat_lahir || '',
      tanggal_lahir: data.tanggal_lahir || '',
      alamat_ktp: data.alamat_ktp || '',
      alamat_domisili: data.alamat_domisili || '',
      lama_domisili_tahun: data.lama_domisili_tahun || null,
      pekerjaan: data.pekerjaan || '',
      posisi_jabatan: data.posisi_jabatan || '',
      unit_kerja: data.unit_kerja || '',
      penjelasan_narasi: data.penjelasan_narasi || '',
      jurusan_tujuan: data.jurusan_tujuan || '',
      jenjang_pendidikan: data.jenjang_pendidikan || '',
      unit_tujuan_pemanfaatan: data.unit_tujuan_pemanfaatan || '',
      rencana_tahun_studi: data.rencana_tahun_studi || null,
      no_hp: data.no_hp || '',
      no_whatsapp: data.no_whatsapp || '',
      email: data.email || '',
      status: 'diajukan',
      pasfoto: '',
      dokumen: ''
    }
    setPengusulanData([...pengusulanData, newItem])
  }

  const handleUpdatePengusulan = (id: string, data: Partial<PengusulanItem>) => {
    setPengusulanData(pengusulanData.map(item => item.id === id ? { ...item, ...data } : item))
  }

  const handleDeletePengusulan = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      setPengusulanData(pengusulanData.filter(item => item.id !== id))
    }
  }

  // CRUD Operations for Penetapan
  const handleAddPenetapan = (data: Partial<PenetapanItem>) => {
    const newItem: PenetapanItem = {
      id: Date.now().toString(),
      nik: data.nik || '',
      nama_lengkap: data.nama_lengkap || '',
      jurusan_tujuan: data.jurusan_tujuan || '',
      jenjang_pendidikan: data.jenjang_pendidikan || '',
      unit_tujuan_pemanfaatan: data.unit_tujuan_pemanfaatan || '',
      rencana_tahun_studi: data.rencana_tahun_studi || null,
      no_sk_penetapan: data.no_sk_penetapan || '',
      tanggal_penetapan: new Date().toISOString().split('T')[0],
      status_penetapan: 'ditetapkan',
      catatan_penetapan: data.catatan_penetapan || '',
      link_foto_pasfoto: '',
      link_dokumen_pdf: '',
      periode_pemberian: data.periode_pemberian || ''
    }
    setPenetapanData([...penetapanData, newItem])
  }

  const handleUpdatePenetapan = (id: string, data: Partial<PenetapanItem>) => {
    setPenetapanData(penetapanData.map(item => item.id === id ? { ...item, ...data } : item))
  }

  const handleDeletePenetapan = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      setPenetapanData(penetapanData.filter(item => item.id !== id))
    }
  }

  // CRUD Operations for Users
  const handleAddUser = (data: Partial<User>) => {
    const newUser: User = {
      id: Date.now().toString(),
      nama_lengkap: data.nama_lengkap || '',
      username: data.username || '',
      password: data.password || '',
      email: data.email || '',
      role: data.role || 'viewer',
      status: data.status || 'aktif'
    }
    setUsersData([...usersData, newUser])
  }

  const handleUpdateUser = (id: string, data: Partial<User>) => {
    setUsersData(usersData.map(item => item.id === id ? { ...item, ...data } : item))
  }

  const handleDeleteUser = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      setUsersData(usersData.filter(item => item.id !== id))
    }
  }

  // Filter data based on search
  const filteredRoadmap = roadmapData.filter(item => 
    item.jurusan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.perguruan_tinggi.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredPengusulan = pengusulanData.filter(item =>
    item.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.jurusan_tujuan.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredPenetapan = penetapanData.filter(item =>
    item.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.no_sk_penetapan?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // =====================================================
  // SPLASH SCREEN COMPONENT
  // =====================================================
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex flex-col items-center justify-center z-50">
        <div className="text-center space-y-8 animate-fade-in">
          {/* Logo */}
          <div className="relative">
            <div className="w-32 h-32 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl">
              <GraduationCap className="w-20 h-20 text-emerald-600" />
            </div>
            <Heart className="absolute -bottom-2 -right-2 w-12 h-12 text-red-500 fill-red-500 animate-pulse" />
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-5xl font-bold text-white tracking-tight">SIMBAKES</h1>
            <p className="text-xl text-emerald-100 font-medium">Beasiswa Tematik Bidang Kesehatan</p>
          </div>

          {/* Progress Bar */}
          <div className="w-64 mx-auto">
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-100 ease-out"
                style={{ width: `${splashProgress}%` }}
              />
            </div>
            <p className="text-sm text-emerald-100 mt-2">Memuat platform... {splashProgress}%</p>
          </div>
        </div>
      </div>
    )
  }

  // =====================================================
  // MAIN APPLICATION
  // =====================================================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md">
                <GraduationCap className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">SIMBAKES</h1>
                <p className="text-xs text-emerald-200 hidden sm:block">Beasiswa Tematik Bidang Kesehatan</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {!isLoggedIn ? (
                <Button 
                  variant="outline" 
                  className="border-white text-white hover:bg-white hover:text-emerald-700"
                  onClick={() => setShowLoginDialog(true)}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login Admin
                </Button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-medium">{currentUser?.nama_lengkap}</span>
                    <Badge variant="secondary" className="bg-yellow-500 text-yellow-900">
                      {currentUser?.role}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-white text-white hover:bg-white hover:text-emerald-700"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-white/20 pt-4">
              {!isLoggedIn ? (
                <Button 
                  variant="outline" 
                  className="w-full border-white text-white hover:bg-white hover:text-emerald-700"
                  onClick={() => {
                    setShowLoginDialog(true)
                    setMobileMenuOpen(false)
                  }}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login Admin
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-3 rounded-lg">
                    <ShieldCheck className="w-5 h-5" />
                    <span>{currentUser?.nama_lengkap}</span>
                    <Badge>{currentUser?.role}</Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full border-white text-white hover:bg-white hover:text-emerald-700"
                    onClick={() => {
                      handleLogout()
                      setMobileMenuOpen(false)
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 gap-2 p-2 bg-white shadow-md rounded-xl h-auto">
            {/* Section 1: Informasi Penting */}
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm py-3">
              <BookOpen className="w-4 h-4 sm:mr-2 hidden sm:block" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="petunjuk" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm py-3">
              <HelpCircle className="w-4 h-4 sm:mr-2 hidden sm:block" />
              Petunjuk
            </TabsTrigger>
            <TabsTrigger value="informasi" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm py-3">
              <Info className="w-4 h-4 sm:mr-2 hidden sm:block" />
              Informasi
            </TabsTrigger>
            
            {/* Section 2: Menu Utama */}
            <TabsTrigger value="roadmap" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs sm:text-sm py-3">
              <Map className="w-4 h-4 sm:mr-2 hidden sm:block" />
              Roadmap
            </TabsTrigger>
            <TabsTrigger value="formulir" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs sm:text-sm py-3">
              <FileText className="w-4 h-4 sm:mr-2 hidden sm:block" />
              Formulir
            </TabsTrigger>
            <TabsTrigger value="datapengusulan" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs sm:text-sm py-3">
              <Database className="w-4 h-4 sm:mr-2 hidden sm:block" />
              Pengusulan
            </TabsTrigger>
            <TabsTrigger value="datapenetapan" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs sm:text-sm py-3">
              <ClipboardList className="w-4 h-4 sm:mr-2 hidden sm:block" />
              Penetapan
            </TabsTrigger>
          </TabsList>

          {/* ===================================================== */}
          {/* SECTION 1: INFORMASI PENTING (PUBLIC ACCESS ONLY) */}
          {/* ===================================================== */}

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Total Beasiswa Tersedia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{roadmapData.filter(r => r.status === 'tersedia').length}</div>
                  <p className="text-xs opacity-75 mt-1">Program aktif</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Pengajuan Aktif</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{pengusulanData.filter(p => p.status !== 'diterima' && p.status !== 'ditolak').length}</div>
                  <p className="text-xs opacity-75 mt-1">Sedang diproses</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Penerima Ditentukan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{penetapanData.length}</div>
                  <p className="text-xs opacity-75 mt-1">SK diterbitkan</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Jurusan Tersedia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{roadmapData.length}</div>
                  <p className="text-xs opacity-75 mt-1">Berbagai program</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Info Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-700">
                    <GraduationCap className="w-5 h-5" />
                    Tentang SIMBAKES
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    SIMBAKES adalah sistem informasi beasiswa tematik bidang kesehatan yang dikelola oleh Kementerian Kesehatan RI. Program ini bertujuan untuk meningkatkan kualitas sumber daya manusia kesehatan Indonesia.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Users className="w-5 h-5" />
                    Sasaran Penerima
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                      Tenaga kesehatan PNS/PPPK
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                      Dokter/dokter spesialis daerah tertinggal
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                      Perawat dan bidan terpilih
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <HeadphonesIcon className="w-5 h-5" />
                    Butuh Bantuan?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <MessageCircle className="w-5 h-5 text-green-500" />
                      <span>WhatsApp: 0812-3456-7890</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-5 h-5 text-blue-500" />
                      <span>Email: help@simbakes.id</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-5 h-5 text-orange-500" />
                      <span>Senin-Jumat, 08:00-16:00 WIB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Petunjuk Penggunaan Tab */}
          <TabsContent value="petunjuk" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl text-emerald-800 flex items-center gap-3">
                  <HelpCircle className="w-7 h-7" />
                  Petunjuk Penggunaan Platform SIMBAKES
                </CardTitle>
                <CardDescription>Panduan lengkap menggunakan fitur-fitur yang tersedia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">1</div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Mengakses Platform</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Buka website SIMBAKES melalui browser Anda. Halaman utama akan menampilkan dashboard dengan informasi penting seputar program beasiswa. Semua informasi pada bagian ini dapat diakses tanpa perlu login.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">2</div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Melihat Roadmap Kebutuhan</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Klik menu "Roadmap Kebutuhan" untuk melihat daftar program beasiswa yang tersedia beserta kualifikasi, jenis pendidikan, dan perguruan tinggi mitra. Data ini bersifat publik dan dapat dilihat oleh siapa saja.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">3</div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Mengajukan Beasiswa</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Klik menu "Formulir Pengusulan" untuk mengisi data diri dan mengajukan beasiswa. Pastikan semua data diisi dengan benar dan lengkap. Dokumen pendukung seperti KTP, ijazah, dan surat rekomendasi perlu disiapkan.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">4</div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Memantau Status Pengajuan</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Setelah mengajukan, Anda dapat memantau status pengajuan melalui menu "Data Pengusulan". Status akan diperbarui secara berkala oleh tim admin mulai dari diajukan, ditinjau, hingga diterima atau ditolak.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">5</div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Untuk Administrator</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Klik tombol "Login Admin" di pojok kanan atas untuk masuk ke panel administrasi. Panel admin menyediakan fitur CRUD lengkap untuk mengelola semua data termasuk roadmap, pengusulan, penetapan, dan manajemen user.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Informasi Tab */}
          <TabsContent value="informasi" className="space-y-6">
            <div className="grid gap-6">
              {informasiData.filter(i => i.status === 'aktif').map((info) => (
                <Card key={info.id} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl text-emerald-800">{info.judul}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={
                            info.kategori === 'pengumuman' ? 'bg-red-100 text-red-700' :
                            info.kategori === 'panduan' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }>
                            {info.kategori}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 whitespace-pre-line leading-relaxed">{info.isi}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Customer Service Section */}
            <Card className="shadow-md bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
              <CardHeader>
                <CardTitle className="text-2xl text-cyan-800 flex items-center gap-3">
                  <HeadphonesIcon className="w-7 h-7" />
                  Layanan Customer Service
                </CardTitle>
                <CardDescription>Hubungi tim kami jika membutuhkan bantuan lebih lanjut</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {csData.sort((a, b) => a.urutan - b.urutan).map((cs) => (
                    <Card key={cs.id} className="border-cyan-200 shadow-sm">
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                            <Users className="w-6 h-6 text-cyan-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{cs.nama_lengkap}</h4>
                            <p className="text-sm text-gray-500">{cs.jabatan}</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          {cs.no_whatsapp && (
                            <a href={`https://wa.me/${cs.no_whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline">
                              <MessageCircle className="w-4 h-4" /> WhatsApp
                            </a>
                          )}
                          {cs.email && (
                            <a href={`mailto:${cs.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                              <Mail className="w-4 h-4" /> {cs.email}
                            </a>
                          )}
                          {cs.no_hp && (
                            <a href={`tel:${cs.no_hp}`} className="flex items-center gap-2 text-gray-600 hover:underline">
                              <Phone className="w-4 h-4" /> {cs.no_hp}
                            </a>
                          )}
                          <div className="flex items-center gap-2 text-gray-500">
                            <Clock className="w-4 h-4" /> {cs.jam_operasional}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================================================== */}
          {/* SECTION 2: MENU UTAMA (PUBLIC - NO SENSITIVE DATA) */}
          {/* ===================================================== */}

          {/* Roadmap Kebutuhan Tab */}
          <TabsContent value="roadmap" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl text-teal-800 flex items-center gap-3">
                      <Map className="w-7 h-7" />
                      Roadmap Kebutuhan Beasiswa
                    </CardTitle>
                    <CardDescription>Daftar program beasiswa yang tersedia sesuai kebutuhan SDM Kesehatan</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="Cari jurusan atau kode..." 
                      className="pl-10 w-full sm:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-teal-50">
                        <TableHead>Kode</TableHead>
                        <TableHead>Jurusan/Program Studi</TableHead>
                        <TableHead className="hidden md:table-cell">Kualifikasi</TableHead>
                        <TableHead className="hidden lg:table-cell">Jenjang</TableHead>
                        <TableHead className="hidden lg:table-cell">Perguruan Tinggi</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoadmap.length > 0 ? filteredRoadmap.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell><Badge variant="outline" className="font-mono">{item.kode}</Badge></TableCell>
                          <TableCell className="font-medium">{item.jurusan}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-600">{item.kualifikasi_awal}</TableCell>
                          <TableCell className="hidden lg:table-cell"><Badge variant="secondary">{item.jenis_pendidikan}</Badge></TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{item.perguruan_tinggi}</TableCell>
                          <TableCell>
                            <Badge className={
                              item.status === 'tersedia' ? 'bg-green-100 text-green-700' :
                              item.status === 'dipenuhi' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }>
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            Tidak ada data yang ditemukan
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Admin CRUD Buttons */}
                {isLoggedIn && currentUser?.role !== 'viewer' && (
                  <div className="mt-4 flex justify-end gap-2">
                    <RoadmapFormDialog onSubmit={handleAddRoadmap} mode="add" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Formulir Pengusulan Tab */}
          <TabsContent value="formulir" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl text-teal-800 flex items-center gap-3">
                  <FileText className="w-7 h-7" />
                  Formulir Pengusulan Beasiswa
                </CardTitle>
                <CardDescription>Isi formulir berikut untuk mengajukan beasiswa SIMBAKES</CardDescription>
              </CardHeader>
              <CardContent>
                <PengusulanForm onSubmit={handleAddPengusulan} isAdmin={isLoggedIn && currentUser?.role !== 'viewer'} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Pengusulan Tab (Public View - No Sensitive Data) */}
          <TabsContent value="datapengusulan" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl text-teal-800 flex items-center gap-3">
                      <Database className="w-7 h-7" />
                      Data Pengusulan Beasiswa
                    </CardTitle>
                    <CardDescription>
                      {isLoggedIn ? 'Daftar lengkap pengajuan beasiswa' : 'Data publik pengajuan (tanpa data personal sensitif)'}
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="Cari nama..." 
                      className="pl-10 w-full sm:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-teal-50">
                        <TableHead>No</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        {isLoggedIn && <TableHead>NIK</TableHead>}
                        <TableHead>Jurusan Tujuan</TableHead>
                        <TableHead className="hidden md:table-cell">Jenjang</TableHead>
                        <TableHead className="hidden lg:table-cell">Unit Kerja</TableHead>
                        <TableHead>Status</TableHead>
                        {isLoggedIn && <TableHead>Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPengusulan.length > 0 ? filteredPengusulan.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.nama_lengkap}</TableCell>
                          {isLoggedIn && <TableCell className="font-mono text-sm">{item.nik}</TableCell>}
                          <TableCell>{item.jurusan_tujuan}</TableCell>
                          <TableCell className="hidden md:table-cell"><Badge variant="secondary">{item.jenjang_pendidikan}</Badge></TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{item.unit_kerja}</TableCell>
                          <TableCell>
                            <Badge className={
                              item.status === 'diterima' ? 'bg-green-100 text-green-700' :
                              item.status === 'ditolak' ? 'bg-red-100 text-red-700' :
                              item.status === 'ditinjau' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {item.status}
                            </Badge>
                          </TableCell>
                          {isLoggedIn && currentUser?.role !== 'viewer' && (
                            <TableCell>
                              <div className="flex gap-1">
                                <PengusulanFormDialog 
                                  initialData={item} 
                                  mode="edit" 
                                  onSubmit={(data) => handleUpdatePengusulan(item.id, data)} 
                                />
                                <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeletePengusulan(item.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={isLoggedIn ? 8 : 7} className="text-center py-8 text-gray-500">
                            Tidak ada data pengusulan
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Penetapan Tab (Public View - No Sensitive Data) */}
          <TabsContent value="datapenetapan" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl text-teal-800 flex items-center gap-3">
                      <ClipboardList className="w-7 h-7" />
                      Data Penetapan Penerima
                    </CardTitle>
                    <CardDescription>
                      {isLoggedIn ? 'Daftar lengkap penerima beasiswa yang ditetapkan' : 'Data publik penerima beasiswa'}
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="Cari nama atau SK..." 
                      className="pl-10 w-full sm:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-teal-50">
                        <TableHead>No</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        {isLoggedIn && <TableHead>NIK</TableHead>}
                        <TableHead>Jurusan</TableHead>
                        <TableHead className="hidden md:table-cell">No SK</TableHead>
                        <TableHead className="hidden md:table-cell">Periode</TableHead>
                        <TableHead>Status</TableHead>
                        {isLoggedIn && <TableHead>Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPenetapan.length > 0 ? filteredPenetapan.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.nama_lengkap}</TableCell>
                          {isLoggedIn && <TableCell className="font-mono text-sm">{item.nik}</TableCell>}
                          <TableCell>{item.jurusan_tujuan}</TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-sm">{item.no_sk_penetapan}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{item.periode_pemberian}</TableCell>
                          <TableCell>
                            <Badge className={
                              item.status_penetapan === 'ditetapkan' ? 'bg-green-100 text-green-700' :
                              item.status_penetapan === 'dibatalkan' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }>
                              {item.status_penetapan}
                            </Badge>
                          </TableCell>
                          {isLoggedIn && currentUser?.role !== 'viewer' && (
                            <TableCell>
                              <div className="flex gap-1">
                                <PenetapanFormDialog 
                                  initialData={item} 
                                  mode="edit" 
                                  onSubmit={(data) => handleUpdatePenetapan(item.id, data)} 
                                />
                                <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeletePenetapan(item.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={isLoggedIn ? 8 : 7} className="text-center py-8 text-gray-500">
                            Tidak ada data penetapan
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Admin Add Button */}
                {isLoggedIn && currentUser?.role !== 'viewer' && (
                  <div className="mt-4 flex justify-end">
                    <PenetapanFormDialog onSubmit={handleAddPenetapan} mode="add" pengusulanData={pengusulanData} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================================================== */}
          {/* SECTION 3: PANEL ADMIN (LOGIN REQUIRED) */}
          {/* ===================================================== */}
          
          {isLoggedIn && currentUser?.role !== 'viewer' && (
            <>
              {/* User Management Tab - Only for superadmin */}
              {currentUser?.role === 'superadmin' && (
                <div className="mt-8 pt-8 border-t">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <ShieldCheck className="w-7 h-7 text-purple-600" />
                    Panel Administrasi
                  </h2>
                  
                  <Card className="shadow-md mb-6">
                    <CardHeader>
                      <CardTitle className="text-xl text-purple-800">Manajemen User</CardTitle>
                      <CardDescription>Kelola akun administrator dan operator</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-purple-50">
                              <TableHead>Nama Lengkap</TableHead>
                              <TableHead>Username</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {usersData.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.nama_lengkap}</TableCell>
                                <TableCell className="font-mono text-sm">{user.username}</TableCell>
                                <TableCell className="text-sm">{user.email}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                                    user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }>
                                    {user.role}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={user.status === 'aktif' ? 'default' : 'secondary'}>
                                    {user.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <UserFormDialog 
                                      initialData={user} 
                                      mode="edit" 
                                      onSubmit={(data) => handleUpdateUser(user.id, data)} 
                                    />
                                    <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteUser(user.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <UserFormDialog onSubmit={handleAddUser} mode="add" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-8 h-8 text-emerald-400" />
                <span className="text-xl font-bold">SIMBAKES</span>
              </div>
              <p className="text-gray-400 text-sm">
                Sistem Informasi Beasiswa Tematik Bidang Kesehatan - Membangun SDM Kesehatan Indonesia yang Berkualitas
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Tautan Cepat</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Dashboard</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Petunjuk Penggunaan</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Informasi Terbaru</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Layanan CS</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Kontak</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> info@simbakes.id
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> (021) 1234-5678
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> WhatsApp: 0812-3456-7890
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-500">
            © 2025 SIMBAKES - Kementerian Kesehatan Republik Indonesia. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="w-6 h-6" />
              Login Administrator
            </DialogTitle>
            <DialogDescription>Masukkan kredensial Anda untuk mengakses panel admin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                placeholder="Masukkan username" 
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Masukkan password" 
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              <strong>Demo:</strong> Username: <code>admin</code> / Password: <code>admin123</code>
            </div>
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Masuk
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =====================================================
// FORM DIALOG COMPONENTS FOR CRUD OPERATIONS
// =====================================================

function RoadmapFormDialog({ initialData, mode, onSubmit }: { initialData?: Partial<RoadmapItem>, mode: 'add' | 'edit', onSubmit: (data: Partial<RoadmapItem>) => void }) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<RoadmapItem>>(initialData || {
    jurusan: '', kualifikasi_awal: '', jenis_pendidikan: '', perguruan_tinggi: '', pekerjaan: '', tahun_mulai_studi: new Date().getFullYear(), unit_pendayaguna: '', status: 'tersedia'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={mode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
          {mode === 'add' ? <><Plus className="w-4 h-4 mr-1" /> Tambah</> : <><Pencil className="w-4 h-4 mr-1" /></>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Tambah' : 'Edit'} Roadmap Kebutuhan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jurusan/Program Studi *</Label>
              <Input value={formData.jurusan} onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Jenis Pendidikan</Label>
              <Select value={formData.jenis_pendidikan} onValueChange={(v) => setFormData({ ...formData, jenis_pendidikan: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="D3">D3</SelectItem>
                  <SelectItem value="S1">S1</SelectItem>
                  <SelectItem value="Profesi">Profesi</SelectItem>
                  <SelectItem value="Spesialis">Spesialis</SelectItem>
                  <SelectItem value="S2">S2</SelectItem>
                  <SelectItem value="S3">S3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kualifikasi Awal</Label>
              <Input value={formData.kualifikasi_awal} onChange={(e) => setFormData({ ...formData, kualifikasi_awal: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Perguruan Tinggi</Label>
              <Input value={formData.perguruan_tinggi} onChange={(e) => setFormData({ ...formData, perguruan_tinggi: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Pekerjaan</Label>
              <Input value={formData.pekerjaan} onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tahun Mulai Studi</Label>
              <Input type="number" value={formData.tahun_mulai_studi || ''} onChange={(e) => setFormData({ ...formData, tahun_mulai_studi: parseInt(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Unit Pendayaguna</Label>
              <Input value={formData.unit_pendayaguna} onChange={(e) => setFormData({ ...formData, unit_pendayaguna: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tersedia">Tersedia</SelectItem>
                  <SelectItem value="dipenuhi">Dipenuhi</SelectItem>
                  <SelectItem value="ditangguhkan">Ditangguhkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PengusulanForm({ onSubmit, isAdmin }: { onSubmit: (data: Partial<PengusulanItem>) => void, isAdmin?: boolean }) {
  const [formData, setFormData] = useState<Partial<PengusulanItem>>({
    nama_lengkap: '', nik: '', tempat_lahir: '', tanggal_lahir: '', alamat_ktp: '', alamat_domisili: '', lama_domisili_tahun: null, pekerjaan: '', posisi_jabatan: '', unit_kerja: '', penjelasan_narasi: '', jurusan_tujuan: '', jenjang_pendidikan: '', unit_tujuan_pemanfaatan: '', rencana_tahun_studi: new Date().getFullYear(), no_hp: '', no_whatsapp: '', email: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    if (!isAdmin) {
      alert('Pengajuan berhasil dikirim! Tim kami akan memverifikasi data Anda.')
      setFormData({
        nama_lengkap: '', nik: '', tempat_lahir: '', tanggal_lahir: '', alamat_ktp: '', alamat_domisili: '', lama_domisili_tahun: null, pekerjaan: '', posisi_jabatan: '', unit_kerja: '', penjelasan_narasi: '', jurusan_tujuan: '', jenjang_pendidikan: '', unit_tujuan_pemanfaatan: '', rencana_tahun_studi: new Date().getFullYear(), no_hp: '', no_whatsapp: '', email: ''
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Data Pribadi */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          Data Pribadi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nik">NIK *</Label>
            <Input id="nik" type="text" maxLength={16} placeholder="Nomor Induk Kependudukan (16 digit)" value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nama">Nama Lengkap *</Label>
            <Input id="nama" placeholder="Nama lengkap sesuai KTP" value={formData.nama_lengkap} onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
            <Input id="tempat_lahir" placeholder="Kota kelahiran" value={formData.tempat_lahir} onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
            <Input id="tanggal_lahir" type="date" value={formData.tanggal_lahir} onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="alamat_ktp">Alamat KTP</Label>
            <Textarea id="alamat_ktp" placeholder="Alamat sesuai KTP" value={formData.alamat_ktp} onChange={(e) => setFormData({ ...formData, alamat_ktp: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="alamat_domisili">Alamat Domisili</Label>
            <Textarea id="alamat_domisili" placeholder="Alamat domisili saat ini" value={formData.alamat_domisili} onChange={(e) => setFormData({ ...formData, alamat_domisili: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Lama Domisili (tahun)</Label>
            <Input type="number" placeholder="0" value={formData.lama_domisili_tahun || ''} onChange={(e) => setFormData({ ...formData, lama_domisili_tahun: parseInt(e.target.value) || null })} />
          </div>
        </div>
      </div>

      {/* Data Pekerjaan */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Data Pekerjaan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Pekerjaan *</Label>
            <Input placeholder="Pekerjaan saat ini" value={formData.pekerjaan} onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Posisi/Jabatan</Label>
            <Input placeholder="Jabatan saat ini" value={formData.posisi_jabatan} onChange={(e) => setFormData({ ...formData, posisi_jabatan: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Unit Kerja</Label>
            <Input placeholder="Instansi/tempat kerja" value={formData.unit_kerja} onChange={(e) => setFormData({ ...formData, unit_kerja: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Narasi/Penjelasan</Label>
            <Textarea placeholder="Jelaskan alasan mengajukan beasiswa..." value={formData.penjelasan_narasi} onChange={(e) => setFormData({ ...formData, penjelasan_narasi: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Data Pendidikan Tujuan */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-purple-600" />
          Data Pendidikan Tujuan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Jurusan Tujuan *</Label>
            <Input placeholder="Program studi yang dituju" value={formData.jurusan_tujuan} onChange={(e) => setFormData({ ...formData, jurusan_tujuan: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Jenjang Pendidikan *</Label>
            <Select value={formData.jenjang_pendidikan} onValueChange={(v) => setFormData({ ...formData, jenjang_pendidikan: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih jenjang" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="D3">D3</SelectItem>
                <SelectItem value="S1">S1</SelectItem>
                <SelectItem value="Profesi">Profesi</SelectItem>
                <SelectItem value="Spesialis">Spesialis</SelectItem>
                <SelectItem value="S2">S2</SelectItem>
                <SelectItem value="S3">S3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unit Tujuan Pemanfaatan</Label>
            <Input placeholder="Unit/tempat tugas setelah studi" value={formData.unit_tujuan_pemanfaatan} onChange={(e) => setFormData({ ...formData, unit_tujuan_pemanfaatan: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Rencana Tahun Mulai Studi</Label>
            <Input type="number" value={formData.rencana_tahun_studi || ''} onChange={(e) => setFormData({ ...formData, rencana_tahun_studi: parseInt(e.target.value) })} />
          </div>
        </div>
      </div>

      {/* Kontak */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
          <Phone className="w-5 h-5 text-orange-600" />
          Informasi Kontak
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>No. HP *</Label>
            <Input type="tel" placeholder="08xxxxxxxxxx" value={formData.no_hp} onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>No. WhatsApp</Label>
            <Input type="tel" placeholder="08xxxxxxxxxx" value={formData.no_whatsapp} onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" placeholder="email@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700 px-8">
          {isAdmin ? <><Plus className="w-4 h-4 mr-2" />Tambah Data</> : 'Kirim Pengajuan'}
        </Button>
      </div>
    </form>
  )
}

function PengusulanFormDialog({ initialData, mode, onSubmit }: { initialData?: Partial<PengusulanItem>, mode: 'add' | 'edit', onSubmit: (data: Partial<PengusulanItem>) => void }) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<PengusulanItem>>(initialData || {})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className={mode === 'edit' ? 'text-blue-500 hover:text-blue-700' : ''}>
          {mode === 'edit' ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit' : 'Detail'} Data Pengusulan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>NIK</Label>
              <Input value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={formData.nama_lengkap} onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Jurusan Tujuan</Label>
              <Input value={formData.jurusan_tujuan} onChange={(e) => setFormData({ ...formData, jurusan_tujuan: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diajukan">Diajukan</SelectItem>
                  <SelectItem value="ditinjau">Ditinjau</SelectItem>
                  <SelectItem value="diterima">Diterima</SelectItem>
                  <SelectItem value="ditolak">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            {mode === 'edit' && <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Simpan Perubahan</Button>}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PenetapanFormDialog({ initialData, mode, onSubmit, pengusulanData }: { initialData?: Partial<PenetapanItem>, mode: 'add' | 'edit', onSubmit: (data: Partial<PenetapanItem>) => void, pengusulanData?: PengusulanItem[] }) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<PenetapanItem>>(initialData || {
    nik: '', nama_lengkap: '', jurusan_tujuan: '', jenjang_pendidikan: '', unit_tujuan_pemanfaatan: '', rencana_tahun_studi: null, no_sk_penetapan: '', tanggal_penetapan: new Date().toISOString().split('T')[0], status_penetapan: 'ditetapkan', catatan_penetapan: '', periode_pemberian: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setOpen(false)
  }

  // Auto-fill from selected pengusulan
  const handleNikChange = (nik: string) => {
    const pengusulan = pengusulanData?.find(p => p.nik === nik)
    if (pengusulan) {
      setFormData({
        ...formData,
        nik: pengusulan.nik,
        nama_lengkap: pengusulan.nama_lengkap,
        jurusan_tujuan: pengusulan.jurusan_tujuan,
        jenjang_pendidikan: pengusulan.jenjang_pendidikan,
        unit_tujuan_pemanfaatan: pengusulan.unit_tujuan_pemanfaatan,
        rencana_tahun_studi: pengusulan.rencana_tahun_studi
      })
    } else {
      setFormData({ ...formData, nik })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={mode === 'add' ? 'bg-teal-600 hover:bg-teal-700' : ''}>
          {mode === 'add' ? <><Plus className="w-4 h-4 mr-1" /> Tetapkan Penerima</> : <><Pencil className="w-4 h-4 mr-1" /></>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Tambah' : 'Edit'} Data Penetapan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'add' && pengusulanData && (
            <div className="space-y-2">
              <Label>Pilih Penerima dari Data Pengusulan</Label>
              <Select onValueChange={handleNikChange}>
                <SelectTrigger><SelectValue placeholder="Pilih calon penerima" /></SelectTrigger>
                <SelectContent>
                  {pengusulanData.filter(p => p.status === 'diterima').map(p => (
                    <SelectItem key={p.id} value={p.nik}>{p.nama_lengkap} - {p.jurusan_tujuan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>NIK</Label>
              <Input value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} readOnly={mode === 'add'} />
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={formData.nama_lengkap} onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>No SK Penetapan *</Label>
              <Input value={formData.no_sk_penetapan} onChange={(e) => setFormData({ ...formData, no_sk_penetapan: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Penetapan</Label>
              <Input type="date" value={formData.tanggal_penetapan} onChange={(e) => setFormData({ ...formData, tanggal_penetapan: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status Penetapan</Label>
              <Select value={formData.status_penetapan} onValueChange={(v) => setFormData({ ...formData, status_penetapan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ditetapkan">Ditetapkan</SelectItem>
                  <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
                  <SelectItem value="direvisi">Direvisi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Periode Pemberian</Label>
              <Input placeholder="Contoh: 2025-2028" value={formData.periode_pemberian} onChange={(e) => setFormData({ ...formData, periode_pemberian: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Catatan Penetapan</Label>
              <Textarea value={formData.catatan_penetapan} onChange={(e) => setFormData({ ...formData, catatan_penetapan: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700">Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UserFormDialog({ initialData, mode, onSubmit }: { initialData?: Partial<User>, mode: 'add' | 'edit', onSubmit: (data: Partial<User>) => void }) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<User>>(initialData || {
    nama_lengkap: '', username: '', password: '', email: '', role: 'viewer', status: 'aktif'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={mode === 'add' ? 'bg-purple-600 hover:bg-purple-700' : ''}>
          {mode === 'add' ? <><Plus className="w-4 h-4 mr-1" /> Tambah User</> : <><Pencil className="w-4 h-4 mr-1" /></>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Tambah' : 'Edit'} User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Lengkap</Label>
            <Input value={formData.nama_lengkap} onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
          </div>
          {(mode === 'add') && (
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
            </div>
          )}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="non-aktif">Non-Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
