-- ============================================================
-- SIMBAKES [REVISI] — SETUP STORAGE UPLOAD (SATU SKRIP LENGKAP & RAPI)
-- ============================================================
-- Jalankan SEKALI di Supabase Dashboard → SQL Editor → New query → Paste → Run
-- (Aman dijalankan berulang — idempotent.)
--
-- Menjadi SATU tempat untuk semua kebutuhan upload file aplikasi:
--
--   1. FORM "AJUKAN REKOMENDASI" (peserta)
--      - Foto Pasfoto        -> pengajuan/<no_register>/foto-*.jpg|png|webp
--      - Dokumen Kelengkapan -> pengajuan/<no_register>/dokumen-*.pdf
--      - Surat Pernyataan    -> pengajuan/<no_register>/surat-*.pdf
--      URL publik otomatis tersimpan ke kolom submissions.foto_peserta
--      dan submissions.dokumen_kelengkapan (dipisah baris baru utk 2 URL).
--
--   2. FORM PERBAIKAN/REVISI (peserta, via Cek Status)
--      - Foto / Dokumen baru -> pengajuan/<no_register>/revisi-foto-* /
--                               pengajuan/<no_register>/revisi-dokumen-*
--      URL publik otomatis menggantikan/menambah nilai kolom lama.
--
--   3. PANEL ADMIN > DATA PENGUSULAN > EDIT > "REKOMENDASI DINKES"
--      - File rekomendasi    -> rekomendasi/<no_register>/rekomendasi-*
--      URL publik otomatis tersimpan ke kolom submissions.rekomendasi_dinkes.
--
-- Bucket: 'pengajuan-files' (public, batas 10 MB per file).
-- Policy: baca publik; tulis (insert/update/delete) terbatas pada folder
--         aplikasi di dalam bucket ini.
--
-- CATATAN MODEL KEAMANAN: sama seperti model template SIMBAKES yang sudah
-- berjalan (RLS-akun-peserta-CRUD.sql, SECURITY-HARDENING.sql), operasi
-- storage memakai anon key + penegakan di sisi aplikasi. DELETE diperlukan
-- agar: (a) rollback upload gagal otomatis bekerja, (b) file lama terganti
-- saat admin mengganti file rekomendasi, tidak menumpuk sampah file.
-- ============================================================

-- ------------------------------------------------------------
-- 1) BUCKET: buat/permak bucket 'pengajuan-files'
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('pengajuan-files', 'pengajuan-files', true, 10485760)   -- 10 MB
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760;

-- ------------------------------------------------------------
-- 2) POLICY BACA: semua orang boleh melihat/mengunduh file
--    (dipakai pratinjau foto, tombol "Buka Dokumen", panel admin)
-- ------------------------------------------------------------
drop policy if exists "public_read_pengajuan_files" on storage.objects;
create policy "public_read_pengajuan_files"
on storage.objects for select
using (bucket_id = 'pengajuan-files');

-- ------------------------------------------------------------
-- 3) POLICY TULIS: upload/hapus HANYA di folder aplikasi
--    ('pengajuan/' untuk berkas peserta, 'rekomendasi/' untuk file
--     Rekomendasi Dinkes dari panel admin)
-- ------------------------------------------------------------
drop policy if exists "anon_upload_pengajuan_files" on storage.objects;
create policy "anon_upload_pengajuan_files"
on storage.objects for insert to anon
with check (
    bucket_id = 'pengajuan-files'
    and (name like 'pengajuan/%' or name like 'rekomendasi/%')
);

drop policy if exists "anon_update_pengajuan_files" on storage.objects;
create policy "anon_update_pengajuan_files"
on storage.objects for update to anon
using (
    bucket_id = 'pengajuan-files'
    and (name like 'pengajuan/%' or name like 'rekomendasi/%')
);

-- Policy DELETE (BARU — sebelumnya tidak ada):
-- wajib ada agar rollback upload & penggantian file rekomendasi berfungsi.
drop policy if exists "anon_delete_pengajuan_files" on storage.objects;
create policy "anon_delete_pengajuan_files"
on storage.objects for delete to anon
using (
    bucket_id = 'pengajuan-files'
    and (name like 'pengajuan/%' or name like 'rekomendasi/%')
);

-- ------------------------------------------------------------
-- 4) BERSIH-BERSIH: policy lama versi awal (tanpa pembatasan folder)
--    dihapus bila masih tertinggal dari skrip lama.
-- ------------------------------------------------------------
drop policy if exists "anon_upload_pengajuan_files_v2" on storage.objects;

-- ============================================================
-- VERIFIKASI (opsional — jalankan terpisah bila ingin memastikan)
--   select id, name, public, file_size_limit from storage.buckets
--     where id = 'pengajuan-files';
--   select policyname, cmd from pg_policies
--     where schemaname = 'storage' and tablename = 'objects'
--       and policyname like '%pengajuan_files%'
--     order by policyname;
-- Hasil yang diharapkan:
--   1 bucket (public = true, limit 10 MB) + 4 policy
--   (select / insert / update / delete).
--
-- Setelah skrip ini dijalankan:
--   - Semua upload file peserta & admin TERSIMPAN OTOMATIS di Supabase
--     Storage (bucket pengajuan-files), URL-nya otomatis masuk ke tabel
--     submissions (kolom foto_peserta, dokumen_kelengkapan,
--     rekomendasi_dinkes).
--   - Tidak perlu membuat bucket manual lewat dashboard.
-- ============================================================
