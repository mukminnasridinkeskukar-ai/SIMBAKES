'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  FileEdit,
  Upload,
  GraduationCap,
  FileText,
  CheckCircle,
  X,
  Loader2,
  AlertCircle,
  User,
  MapPin,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  FileImage
} from 'lucide-react'

// Types based on Excel template data_pengusulan sheet (21 columns)
interface FileUpload {
  file: File | null
  preview: string | null
  name: string
  uploading: boolean
  uploadedPath: string | null
  error: string | null
}

interface FormData {
  // Data Pribadi
  nik: string
  namaLengkap: string
  tempatLahir: string
  tanggalLahir: string
  
  // Alamat
  alamatKTP: string
  alamatDomisili: string
  lamaDomisiliTahun: string
  
  // Data Pekerjaan
  pekerjaan: string
  posisiJabatan: string
  unitKerja: string
  
  // Narasi
  penjelasanNarasi: string
  
  // Data Pendidikan Tujuan
  jurusanTujuan: string
  jenjangPendidikan: string
  unitTujuanPemanfaatan: string
  rencanaTahunStudi: string
  
  // Kontak
  noHP: string
  noWhatsApp: string
  email: string
  
  // Dokumen
  pasfoto: FileUpload
  dokumenKTP: FileUpload
  dokumenKTM: FileUpload
  dokumenTranskrip: FileUpload
}

interface FormErrors {
  [key: string]: string
}

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB (increased for documents)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

// Options based on Excel data
const PEKERJAAN_OPTIONS = [
  'ASN (Aparatur Sipil Negara)',
  'Non ASN',
  'Swasta',
  'Mahasiswa',
  'Lainnya'
]

const JENJANG_PENDIDIKAN_OPTIONS = [
  { value: 'Sp1', label: 'Spesialis 1 (Sp1)' },
  { value: 'Sp2', label: 'Spesialis 2 (Sp2)' },
  { value: 'S1 + Profesi', label: 'S1 + Profesi' },
  { value: 's1_profesi_unmul', label: 'S1 Profesi UNMUL' },
  { value: 's2_ugm', label: 'S2 UGM' },
  { value: 'D3', label: 'Diploma (D3)' },
  { value: 'S1', label: 'Sarjana (S1)' },
  { value: 'S2', label: 'Magister (S2)' },
  { value: 'S3', label: 'Doktor (S3)' }
]

const JURUSAN_OPTIONS = [
  'Spesialis Jantung dan Pembuluh Darah',
  'Spesialis Jantung - Intervensi',
  'Spesialis Jantung - Intensivist',
  'Spesialis Anak',
  'Spesialis Bedah',
  'Spesialis Radiologi',
  'Bidan',
  'Dokter Umum',
  'Magister Farmasi Klinik',
  'Keperawatan',
  'Kebidanan',
  'Farmasi',
  'Kesehatan Masyarakat',
  'Gizi',
  'Fisioterapi',
  'Elektromedikal',
  'Rekam Medis',
  'Teknologi Laboratorium Medik',
  'Lainnya'
]

const UNIT_PENDAYAGUNA_OPTIONS = [
  'RSUD Aji Muhammad Parikesit',
  'RSUD Aji Muhammad Idris',
  'RSUD Aji Batara Agung Dewa Sakti',
  'Puskesmas [Pilih]',
  'Klinik [Pilih]',
  'Dinas Kesehatan',
  'Lainnya'
]

export default function FormulirPengusulanPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Auth state
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  
  // Form state - initialized with all 21 fields from Excel template
  const [formData, setFormData] = useState<FormData>({
    // Data Pribadi
    nik: '',
    namaLengkap: '',
    tempatLahir: '',
    tanggalLahir: '',
    
    // Alamat
    alamatKTP: '',
    alamatDomisili: '',
    lamaDomisiliTahun: '',
    
    // Data Pekerjaan
    pekerjaan: '',
    posisiJabatan: '',
    unitKerja: '',
    
    // Narasi
    penjelasanNarasi: '',
    
    // Data Pendidikan Tujuan
    jurusanTujuan: '',
    jenjangPendidikan: '',
    unitTujuanPemanfaatan: '',
    rencanaTahunStudi: (new Date().getFullYear() + 1).toString(),
    
    // Kontak
    noHP: '',
    noWhatsApp: '',
    email: '',
    
    // Dokumen
    pasfoto: { file: null, preview: null, name: '', uploading: false, uploadedPath: null, error: null },
    dokumenKTP: { file: null, preview: null, name: '', uploading: false, uploadedPath: null, error: null },
    dokumenKTM: { file: null, preview: null, name: '', uploading: false, uploadedPath: null, error: null },
    dokumenTranskrip: { file: null, preview: null, name: '', uploading: false, uploadedPath: null, error: null }
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [nomorPengajuan, setNomorPengajuan] = useState('')
  
  // Refs for file inputs
  const pasfotoInputRef = useRef<HTMLInputElement>(null)
  const ktpInputRef = useRef<HTMLInputElement>(null)
  const ktmInputRef = useRef<HTMLInputElement>(null)
  const transkripInputRef = useRef<HTMLInputElement>(null)

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Anda harus login untuk mengakses halaman ini')
        router.push('/dashboard/login')
        return
      }
      setUser({ id: user.id, email: user.email || '' })
      
      // Pre-fill email if available
      if (user.email) {
        setFormData(prev => ({ ...prev, email: user.email || '' }))
      }
    } catch (error) {
      console.error('Auth check error:', error)
      toast.error('Terjadi kesalahan saat memverifikasi autentikasi')
    } finally {
      setLoadingAuth(false)
    }
  }

  // Validate file
  const validateFile = useCallback((file: File, type: 'image' | 'doc'): string | null => {
    const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOC_TYPES
    if (!allowedTypes.includes(file.type)) {
      return type === 'image' 
        ? 'Format gambar tidak didukung. Gunakan JPG atau PNG.'
        : 'Format file tidak didukung. Gunakan PDF, JPG, atau PNG.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Ukuran file terlalu besar. Maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB.`
    }
    return null
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: 'pasfoto' | 'dokumenKTP' | 'dokumenKTM' | 'dokumenTranskrip',
    type: 'image' | 'doc' = 'doc'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const error = validateFile(file, type)
    
    setFormData(prev => ({
      ...prev,
      [fieldName]: {
        file: file || null,
        preview: file ? URL.createObjectURL(file) : null,
        name: file?.name || '',
        uploading: false,
        uploadedPath: null,
        error
      }
    }))
    
    if (error) {
      toast.error(error)
      setErrors(prev => ({ ...prev, [fieldName]: error }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }, [validateFile])

  // Remove file
  const removeFile = useCallback((fieldName: 'pasfoto' | 'dokumenKTP' | 'dokumenKTM' | 'dokumenTranskrip') => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: {
        file: null,
        preview: null,
        name: '',
        uploading: false,
        uploadedPath: null,
        error: null
      }
    }))
    
    // Clear input value
    const refs: Record<string, React.RefObject<HTMLInputElement | null>> = {
      pasfoto: pasfotoInputRef,
      dokumenKTP: ktpInputRef,
      dokumenKTM: ktmInputRef,
      dokumenTranskrip: transkripInputRef
    }
    
    if (refs[fieldName]?.current) {
      refs[fieldName].current!.value = ''
    }
  }, [])

  // Upload single file to Supabase Storage
  const uploadToStorage = async (
    file: File,
    fieldName: string,
    userId: string,
    bucket: string = 'documents'
  ): Promise<string> => {
    // Set uploading state
    setFormData(prev => ({
      ...prev,
      [fieldName as keyof FormData]: {
        ...(prev[fieldName as keyof FormData] as FileUpload),
        uploading: true,
        error: null
      }
    }))

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}_${Date.now()}_${fieldName}.${fileExt}`
      const filePath = `pengusulan/${fileName}`

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)

      // Update state with success
      setFormData(prev => ({
        ...prev,
        [fieldName as keyof FormData]: {
          ...(prev[fieldName as keyof FormData] as FileUpload),
          uploading: false,
          uploadedPath: filePath
        }
      }))

      return urlData.publicUrl
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengunggah file'
      
      setFormData(prev => ({
        ...prev,
        [fieldName as keyof FormData]: {
          ...(prev[fieldName as keyof FormData] as FileUpload),
          uploading: false,
          error: errorMessage
        }
      }))

      throw new Error(`Gagal upload ${fieldName}: ${errorMessage}`)
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validasi Data Pribadi
    if (!formData.nik.trim()) {
      newErrors.nik = 'NIK wajib diisi'
    } else if (!/^\d{16}$/.test(formData.nik.trim())) {
      newErrors.nik = 'NIK harus 16 digit angka'
    }

    if (!formData.namaLengkap.trim()) {
      newErrors.namaLengkap = 'Nama lengkap wajib diisi'
    }

    if (!formData.tempatLahir.trim()) {
      newErrors.tempatLahir = 'Tempat lahir wajib diisi'
    }

    if (!formData.tanggalLahir) {
      newErrors.tanggalLahir = 'Tanggal lahir wajib diisi'
    }

    // Validasi Alamat
    if (!formData.alamatKTP.trim()) {
      newErrors.alamatKTP = 'Alamat KTP wajib diisi'
    }

    if (!formData.alamatDomisili.trim()) {
      newErrors.alamatDomisili = 'Alamat domisili wajib diisi'
    }

    if (!formData.lamaDomisiliTahun.trim()) {
      newErrors.lamaDomisiliTahun = 'Lama domisili wajib diisi'
    } else if (parseInt(formData.lamaDomisiliTahun) < 0) {
      newErrors.lamaDomisiliTahun = 'Lama domisili tidak valid'
    }

    // Validasi Data Pendidikan Tujuan (WAJIB dari Excel)
    if (!formData.jurusanTujuan.trim()) {
      newErrors.jurusanTujuan = 'Jurusan tujuan wajib dipilih'
    }

    if (!formData.jenjangPendidikan.trim()) {
      newErrors.jenjangPendidikan = 'Jenjang pendidikan wajib dipilih'
    }

    if (!formData.unitTujuanPemanfaatan.trim()) {
      newErrors.unitTujuanPemanfaatan = 'Unit tujuan pemanfaatan wajib dipilih'
    }

    if (!formData.rencanaTahunStudi.trim()) {
      newErrors.rencanaTahunStudi = 'Rencana tahun studi wajib diisi'
    }

    // Validasi Kontak
    if (!formData.noHP.trim()) {
      newErrors.noHP = 'Nomor HP wajib diisi'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email wajib diisi'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid'
    }

    // Validasi Dokumen
    if (!formData.dokumenKTP.file) {
      newErrors.dokumenKTP = 'Dokumen KTP wajib diunggah'
    } else if (formData.dokumenKTP.error) {
      newErrors.dokumenKTP = formData.dokumenKTP.error
    }

    if (!formData.dokumenKTM.file) {
      newErrors.dokumenKTM = 'Dokumen KTM wajib diunggah'
    } else if (formData.dokumenKTM.error) {
      newErrors.dokumenKTM = formData.dokumenKTM.error
    }

    if (!formData.dokumenTranskrip.file) {
      newErrors.dokumenTranskrip = 'Dokumen Transkrip Nilai wajib diunggah'
    } else if (formData.dokumenTranskrip.error) {
      newErrors.dokumenTranskrip = formData.dokumenTranskrip.error
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Calculate form progress
  const calculateProgress = (): number => {
    let filled = 0
    const total = 18 // Total required fields
    
    const requiredFields = [
      formData.nik,
      formData.namaLengkap,
      formData.tempatLahir,
      formData.tanggalLahir,
      formData.alamatKTP,
      formData.alamatDomisili,
      formData.lamaDomisiliTahun,
      formData.jurusanTujuan,
      formData.jenjangPendidikan,
      formData.unitTujuanPemanfaatan,
      formData.rencanaTahunStudi,
      formData.noHP,
      formData.email,
      formData.pasfoto.file,
      formData.dokumenKTP.file,
      formData.dokumenKTM.file,
      formData.dokumenTranskrip.file
    ]
    
    filled = requiredFields.filter(field => field && String(field).trim()).length
    
    return Math.round((filled / total) * 100)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('Anda harus login untuk mengirim pengusulan')
      router.push('/dashboard/login')
      return
    }

    // Validate form first
    if (!validateForm()) {
      toast.error('Mohon lengkapi semua field yang wajib diisi')
      return
    }

    setIsSubmitting(true)

    try {
      // Upload all files to Supabase Storage
      const [ktpUrl, ktmUrl, transkripUrl, pasfotoUrl] = await Promise.all([
        uploadToStorage(formData.dokumenKTP.file!, 'dokumenKTP', user.id),
        uploadToStorage(formData.dokumenKTM.file!, 'dokumenKTM', user.id),
        uploadToStorage(formData.dokumenTranskrip.file!, 'dokumenTranskrip', user.id),
        formData.pasfoto.file 
          ? uploadToStorage(formData.pasfoto.file!, 'pasfoto', user.id, 'pasphotos')
          : Promise.resolve(null)
      ])

      // Insert data into pengusulan table (matching Excel columns)
      const { data: insertedData, error: insertError } = await supabase
        .from('pengusulan')
        .insert({
          user_id: user.id,
          // Data Pribadi
          nik: formData.nik.trim(),
          nama_lengkap: formData.namaLengkap.trim(),
          tempat_lahir: formData.tempatLahir.trim(),
          tanggal_lahir: formData.tanggalLahir,
          // Alamat
          alamat_ktp: formData.alamatKTP.trim(),
          alamat_domisili: formData.alamatDomisili.trim(),
          lama_domisili_tahun: parseInt(formData.lamaDomisiliTahun) || 0,
          // Data Pekerjaan
          pekerjaan: formData.pekerjaan || null,
          posisi_jabatan: formData.posisiJabatan || null,
          unit_kerja: formData.unitKerja || null,
          // Narasi
          penjelasan_narasi: formData.penjelasanNarasi || null,
          // Data Pendidikan Tujuan
          jurusan_tujuan: formData.jurusanTujuan.trim(),
          jenjang_pendidikan: formData.jenjangPendidikan.trim(),
          unit_tujuan_pemanfaatan: formData.unitTujuanPemanfaatan.trim(),
          rencana_tahun_studi: parseInt(formData.rencanaTahunStudi),
          // Kontak
          no_hp: formData.noHP.trim(),
          no_whatsapp: formData.noWhatsApp || formData.noHP.trim(), // Default to HP if WA empty
          email: formData.email.trim(),
          // Status default: 'Sedang Diproses'
          status: 'Sedang Diproses',
          // Dokumen URLs
          pasfoto: pasfotoUrl,
          dokumen_ktp: ktpUrl,
          dokumen_ktm: ktmUrl,
          dokumen_transkrip: transkripUrl,
          created_at: new Date().toISOString()
        })
        .select('nomor_pengajuan')
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw new Error('Gagal menyimpan data pengusulan: ' + insertError.message)
      }

      // Success
      setNomorPengajuan(insertedData.nomor_pengajuan)
      setIsSuccess(true)
      toast.success('Pengusulan beasiswa berhasil dikirim!')
      
      // Redirect after showing success message
      setTimeout(() => {
        router.push('/dashboard/data-pengusulan')
      }, 5000)

    } catch (error: unknown) {
      console.error('Submission error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengirim pengusulan'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading auth state
  if (loadingAuth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Memverifikasi autentikasi...</p>
        </div>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto bg-white rounded-2xl p-8 shadow-lg border border-emerald-100">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Pengusulan Berhasil! 🎉</h1>
          <p className="text-gray-600 mb-4">
            Formulir pengusulan beasiswa Anda telah berhasil dikirim dan akan segera diverifikasi oleh tim kami.
          </p>
          <div className="bg-emerald-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Nomor Pengajuan:</p>
            <p className="font-mono font-bold text-lg text-emerald-700">{nomorPengajuan}</p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/dashboard/data-pengusulan')}
              className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
            >
              Lihat Status Berkas
            </button>
            <p className="text-xs text-gray-500">
              Anda akan dialihkan otomatis dalam beberapa detik...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render file upload card component
  const renderFileUploadCard = (
    fieldName: 'pasfoto' | 'dokumenKTP' | 'dokumenKTM' | 'dokumenTranskrip',
    title: string,
    description: string,
    required: boolean,
    inputRef: React.RefObject<HTMLInputElement | null>,
    type: 'image' | 'doc' = 'doc'
  ) => {
    const fileData = formData[fieldName]
    const hasError = errors[fieldName]
    const isUploaded = fileData.uploadedPath !== null

    return (
      <div className={`relative border-2 rounded-xl p-4 transition-all duration-200 ${
        hasError 
          ? 'border-red-300 bg-red-50/50' 
          : fileData.file 
            ? 'border-emerald-300 bg-emerald-50/50' 
            : 'border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/30'
      }`}>
        <input
          ref={inputRef}
          type="file"
          accept={type === 'image' ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'}
          onChange={(e) => handleFileSelect(e, fieldName, type)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isSubmitting || fileData.uploading}
        />
        
        {!fileData.file ? (
          /* Empty State */
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl transition-colors ${
              hasError ? 'bg-red-100' : 'bg-gray-100 group-hover:bg-emerald-100'
            }`}>
              {type === 'image' ? (
                <FileImage className={`w-6 h-6 transition-colors ${
                  hasError ? 'text-red-500' : 'text-gray-400'
                }`} />
              ) : (
                <Upload className={`w-6 h-6 transition-colors ${
                  hasError ? 'text-red-500' : 'text-gray-400'
                }`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {required && <span className="text-red-500 font-medium">Wajib</span>}
                {required && ' • '}
                {type === 'image' ? 'JPG/PNG' : 'PDF/JPG/PNG'} (Max {MAX_FILE_SIZE / 1024 / 1024}MB)
              </p>
            </div>
          </div>
        ) : (
          /* File Selected State */
          <div className="flex items-center gap-3">
            {fileData.preview && (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                {fileData.file?.type.startsWith('image/') ? (
                  <img src={fileData.preview} alt={title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-red-100">
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{fileData.name}</p>
              <p className="text-xs text-gray-500">
                {fileData.uploading ? (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Mengunggah...
                  </span>
                ) : isUploaded ? (
                  <span className="text-emerald-600 font-medium">✓ Terunggah</span>
                ) : (
                  `${(fileData.file!.size / 1024 / 1024).toFixed(2)} MB`
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeFile(fieldName)
              }}
              disabled={isSubmitting || fileData.uploading}
              className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Error Message */}
        {hasError && (
          <div className="mt-2 flex items-center gap-1.5 text-red-600 text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{hasError}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/25">
            <FileEdit className="w-7 h-7 text-white" />
          </div>
          Formulir Pengusulan Beasiswa
        </h1>
        <p className="text-gray-500 mt-2 ml-14">
          Isi formulir berikut untuk mengajukan beasiswa tematik bidang kesehatan Pemkab Kutai Kartanegara
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress Pengisian</span>
          <span className={`text-sm font-semibold ${calculateProgress() === 100 ? 'text-emerald-600' : 'text-orange-500'}`}>
            {calculateProgress()}%
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              calculateProgress() === 100 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                : 'bg-gradient-to-r from-orange-400 to-amber-500'
            }`}
            style={{ width: `${calculateProgress()}%` }} 
          />
        </div>
        {calculateProgress() === 100 && (
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Semua data sudah lengkap! Silakan kirim pengajuan.
          </p>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <div className="p-1.5 bg-blue-100 rounded-lg h-fit">
          <AlertCircle className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-blue-800">Informasi Penting</p>
          <p className="text-sm text-blue-700 mt-0.5">
            Pastikan semua dokumen yang diunggah jelas dan dapat dibaca. Data yang diisi harus sesuai dengan dokumen yang diunggah.
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ============================================ */}
        {/* SECTION 1: DATA PRIBADI */}
        {/* ============================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            Data Pribadi
            <span className="text-red-500">*</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* NIK */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIK <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nik}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 16)
                  setFormData({ ...formData, nik: value })
                  if (errors.nik) {
                    setErrors(prev => { const n = {...prev}; delete n.nik; return n })
                  }
                }}
                placeholder="16 digit NIK"
                maxLength={16}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono ${
                  errors.nik ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.nik && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.nik}</p>}
            </div>

            {/* Nama Lengkap */}
            <div className="md:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.namaLengkap}
                onChange={(e) => {
                  setFormData({ ...formData, namaLengkap: e.target.value })
                  if (errors.namaLengkap) {
                    setErrors(prev => { const n = {...prev}; delete n.namaLengkap; return n })
                  }
                }}
                placeholder="Masukkan nama lengkap sesuai KTP"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all ${
                  errors.namaLengkap ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.namaLengkap && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.namaLengkap}</p>}
            </div>

            {/* Tempat Lahir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tempat Lahir <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.tempatLahir}
                onChange={(e) => {
                  setFormData({ ...formData, tempatLahir: e.target.value })
                  if (errors.tempatLahir) {
                    setErrors(prev => { const n = {...prev}; delete n.tempatLahir; return n })
                  }
                }}
                placeholder="Kota kelahiran"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all ${
                  errors.tempatLahir ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.tempatLahir && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.tempatLahir}</p>}
            </div>

            {/* Tanggal Lahir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Lahir <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.tanggalLahir}
                onChange={(e) => {
                  setFormData({ ...formData, tanggalLahir: e.target.value })
                  if (errors.tanggalLahir) {
                    setErrors(prev => { const n = {...prev}; delete n.tanggalLahir; return n })
                  }
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all ${
                  errors.tanggalLahir ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.tanggalLahir && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.tanggalLahir}</p>}
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 2: ALAMAT */}
        {/* ============================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            Data Alamat
            <span className="text-red-500">*</span>
          </h2>
          
          <div className="space-y-5">
            {/* Alamat KTP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alamat KTP (sesuai KTP) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.alamatKTP}
                onChange={(e) => {
                  setFormData({ ...formData, alamatKTP: e.target.value })
                  if (errors.alamatKTP) {
                    setErrors(prev => { const n = {...prev}; delete n.alamatKTP; return n })
                  }
                }}
                placeholder="Jl. Nama Jalan No. RT/RW Kelurahan, Kecamatan, Kabupaten/Kota, Provinsi"
                rows={3}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none ${
                  errors.alamatKTP ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.alamatKTP && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.alamatKTP}</p>}
            </div>

            {/* Alamat Domisili & Lama Domisili */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alamat Domisili Saat Ini <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.alamatDomisili}
                  onChange={(e) => {
                    setFormData({ ...formData, alamatDomisili: e.target.value })
                    if (errors.alamatDomisili) {
                      setErrors(prev => { const n = {...prev}; delete n.alamatDomisili; return n })
                    }
                  }}
                  placeholder="Alamat tempat tinggal saat ini"
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none ${
                    errors.alamatDomisili ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.alamatDomisili && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.alamatDomisili}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lama Domisili (tahun) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.lamaDomisiliTahun}
                  onChange={(e) => {
                    setFormData({ ...formData, lamaDomisiliTahun: e.target.value })
                    if (errors.lamaDomisiliTahun) {
                      setErrors(prev => { const n = {...prev}; delete n.lamaDomisiliTahun; return n })
                    }
                  }}
                  placeholder="Contoh: 5"
                  min="0"
                  max="100"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all ${
                    errors.lamaDomisiliTahun ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.lamaDomisiliTahun && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.lamaDomisiliTahun}</p>}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 3: DATA PEKERJAAN */}
        {/* ============================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-orange-600" />
            </div>
            Data Pekerjaan (Opsional)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Pekerjaan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Pekerjaan</label>
              <select
                value={formData.pekerjaan}
                onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white"
              >
                <option value="">Pilih status pekerjaan</option>
                {PEKERJAAN_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Posisi/Jabatan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Posisi/Jabatan</label>
              <input
                type="text"
                value={formData.posisiJabatan}
                onChange={(e) => setFormData({ ...formData, posisiJabatan: e.target.value })}
                placeholder="Contoh: Perawat, Dokter, dll"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            {/* Unit Kerja */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Kerja</label>
              <input
                type="text"
                value={formData.unitKerja}
                onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                placeholder="Nama instansi/unit kerja"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 4: PENJELASAN/NARASI */}
        {/* ============================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            Penjelasan & Motivasi
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jelaskan alasan Anda mengajukan beasiswa ini
            </label>
            <textarea
              value={formData.penjelasanNarasi}
              onChange={(e) => setFormData({ ...formData, penjelasanNarasi: e.target.value })}
              placeholder="Ceritakan motivasi, rencana studi, dan kontribusi yang ingin Anda berikan setelah menyelesaikan pendidikan..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 5: DATA PENDIDIKAN TUJUAN */}
        {/* ============================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
            </div>
            Data Pendidikan Tujuan
            <span className="text-red-500">*</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Jurusan Tujuan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jurusan / Program Studi Tujuan <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.jurusanTujuan}
                onChange={(e) => {
                  setFormData({ ...formData, jurusanTujuan: e.target.value })
                  if (errors.jurusanTujuan) {
                    setErrors(prev => { const n = {...prev}; delete n.jurusanTujuan; return n })
                  }
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white ${
                  errors.jurusanTujuan ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Pilih jurusan tujuan</option>
                {JURUSAN_OPTIONS.map(jurusan => (
                  <option key={jurusan} value={jurusan}>{jurusan}</option>
                ))}
              </select>
              {errors.jurusanTujuan && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.jurusanTujuan}</p>}
              
              {/* Custom jurusan input */}
              {formData.jurusanTujuan === 'Lainnya' && (
                <input
                  type="text"
                  placeholder="Masukkan jurusan lainnya"
                  onChange={(e) => setFormData({ ...formData, jurusanTujuan: e.target.value })}
                  className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              )}
            </div>

            {/* Jenjang Pendidikan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jenjang Pendidikan <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.jenjangPendidikan}
                onChange={(e) => {
                  setFormData({ ...formData, jenjangPendidikan: e.target.value })
                  if (errors.jenjangPendidikan) {
                    setErrors(prev => { const n = {...prev}; delete n.jenjangPendidikan; return n })
                  }
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white ${
                  errors.jenjangPendidikan ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Pilih jenjang pendidikan</option>
                {JENJANG_PENDIDIKAN_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.jenjangPendidikan && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.jenjangPendidikan}</p>}
            </div>

            {/* Unit Tujuan Pemanfaatan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Tujuan Pemanfaatan <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.unitTujuanPemanfaatan}
                onChange={(e) => {
                  setFormData({ ...formData, unitTujuanPemanfaatan: e.target.value })
                  if (errors.unitTujuanPemanfaatan) {
                    setErrors(prev => { const n = {...prev}; delete n.unitTujuanPemanfaatan; return n })
                  }
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white ${
                  errors.unitTujuanPemanfaatan ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Pilih unit tujuan</option>
                {UNIT_PENDAYAGUNA_OPTIONS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              {errors.unitTujuanPemanfaatan && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.unitTujuanPemanfaatan}</p>}
              
              {/* Custom unit input */}
              {formData.unitTujuanPemanfaatan === 'Lainnya' && (
                <input
                  type="text"
                  placeholder="Masukkan unit lainnya"
                  onChange={(e) => setFormData({ ...formData, unitTujuanPemanfaatan: e.target.value })}
                  className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              )}
            </div>

            {/* Rencana Tahun Studi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rencana Tahun Mulai Studi <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.rencanaTahunStudi}
                onChange={(e) => {
                  setFormData({ ...formData, rencanaTahunStudi: e.target.value })
                  if (errors.rencanaTahunStudi) {
                    setErrors(prev => { const n = {...prev}; delete n.rencanaTahunStudi; return n })
                  }
                }}
                placeholder="Contoh: 2026"
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 10}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all ${
                  errors.rencanaTahunStudi ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.rencanaTahunStudi && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.rencanaTahunStudi}</p>}
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 6: INFORMASI KONTAK */}
        {/* ============================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-1.5 bg-teal-100 rounded-lg">
              <Phone className="w-5 h-5 text-teal-600" />
            </div>
            Informasi Kontak
            <span className="text-red-500">*</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* No HP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor HP <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.noHP}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 15)
                  setFormData({ ...formData, noHP: value })
                  if (errors.noHP) {
                    setErrors(prev => { const n = {...prev}; delete n.noHP; return n })
                  }
                }}
                placeholder="08xxxxxxxxxx"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all ${
                  errors.noHP ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.noHP && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.noHP}</p>}
            </div>

            {/* No WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor WhatsApp
              </label>
              <input
                type="tel"
                value={formData.noWhatsApp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 15)
                  setFormData({ ...formData, noWhatsApp: value })
                }}
                placeholder="08xxxxxxxxxx (opsional, kosongkan jika sama dengan HP)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">Biarkan kosong jika sama dengan nomor HP</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  if (errors.email) {
                    setErrors(prev => { const n = {...prev}; delete n.email; return n })
                  }
                }}
                placeholder="email@contoh.com"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.email}</p>}
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* SECTION 7: UNGGAH DOKUMEN */}
        {/* ============================================ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-1.5 bg-rose-100 rounded-lg">
              <Upload className="w-5 h-5 text-rose-600" />
            </div>
            Unggah Dokumen Pendukung
            <span className="text-red-500">*</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pas Foto */}
            {renderFileUploadCard(
              'pasfoto',
              'Pas Foto 3x4',
              'Foto terbaru, background merah',
              true,
              pasfotoInputRef,
              'image'
            )}

            {/* Scan KTP */}
            {renderFileUploadCard(
              'dokumenKTP',
              'Scan KTP',
              'KTP masih berlaku',
              true,
              ktpInputRef,
              'doc'
            )}

            {/* Scan KTM/Ijazah */}
            {renderFileUploadCard(
              'dokumenKTM',
              'Scan KTM / Ijazah',
              'Kartu Mahasiswa atau Ijazah terakhir',
              true,
              ktmInputRef,
              'doc'
            )}

            {/* Transkrip Nilai */}
            {renderFileUploadCard(
              'dokumenTranskrip',
              'Transkrip Nilai',
              'Transkrip nilai resmi dari universitas',
              true,
              transkripInputRef,
              'doc'
            )}
          </div>
          
          {/* Upload Guidelines */}
          <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">📋 Panduan Pengunggahan:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Pastikan dokumen scan/foto jelas dan mudah dibaca</li>
              <li>• Format Pas Foto: JPG/PNG (maks 10MB)</li>
              <li>• Format Dokumen: PDF, JPG, PNG (maks 10MB per file)</li>
              <li>• Dokumen harus masih berlaku (tidak kadaluarsa)</li>
              <li>• Pastikan ukuran file tidak melebihi batas maksimal</li>
            </ul>
          </div>
        </section>

        {/* ============================================ */}
        {/* SUBMIT BUTTON */}
        {/* ============================================ */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-6 py-3.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors order-2 sm:order-1 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 order-1 sm:order-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Mengirim Pengusulan...
              </>
            ) : (
              <>
                <FileEdit className="w-5 h-5" />
                Kirim Usulan Beasiswa
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
