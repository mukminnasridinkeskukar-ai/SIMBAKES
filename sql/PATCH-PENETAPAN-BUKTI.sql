-- ============================================================
-- SIMBAKES [REVISI 15 OKT j] — BUKTI LULUS PT / AKTIF KULIAH (DATA PENETAPAN)
-- ============================================================
-- Jalankan SEKALI di Supabase Dashboard → SQL Editor → New query → Run
-- (Aman dijalankan berulang — idempotent.)
--
-- Tujuan:
--   1. Kolom baru `penetapan.bukti_lulus_pt` (text, URL publik file)
--      — file diupload admin/operator dari menu Data Penetapan
--        (Tambah maupun Edit), disimpan ke Supabase Storage bucket
--        'pengajuan-files' folder 'penetapan/', URL publiknya
--        tersimpan di kolom ini.
--   2. Policy storage: folder 'penetapan/' ditambahkan ke daftar
--      folder aplikasi yang boleh ditulisi anon (satu level dengan
--      'pengajuan/' dan 'rekomendasi/').
--
-- Catatan model keamanan: sama seperti setup-storage-pengajuan.sql —
-- operasi storage memakai anon key + penegakan di sisi aplikasi
-- (menu Data Penetapan hanya bisa dibuka superadmin/operator/admin).
-- ============================================================

-- ------------------------------------------------------------
-- 1) KOLOM BARU: bukti_lulus_pt (URL file bukti lulus PT / aktif kuliah)
-- ------------------------------------------------------------
alter table penetapan add column if not exists bukti_lulus_pt text;

comment on column penetapan.bukti_lulus_pt is
  'URL publik file bukti lulus PT / aktif kuliah (upload admin/operator, bucket pengajuan-files folder penetapan/)';

-- ------------------------------------------------------------
-- 2) STORAGE: tambahkan folder 'penetapan/' ke policy tulis bucket
--    'pengajuan-files' (insert / update / delete utk anon)
-- ------------------------------------------------------------
drop policy if exists "anon_upload_pengajuan_files" on storage.objects;
create policy "anon_upload_pengajuan_files"
on storage.objects for insert to anon
with check (
    bucket_id = 'pengajuan-files'
    and (name like 'pengajuan/%' or name like 'rekomendasi/%' or name like 'penetapan/%')
);

drop policy if exists "anon_update_pengajuan_files" on storage.objects;
create policy "anon_update_pengajuan_files"
on storage.objects for update to anon
using (
    bucket_id = 'pengajuan-files'
    and (name like 'pengajuan/%' or name like 'rekomendasi/%' or name like 'penetapan/%')
);

drop policy if exists "anon_delete_pengajuan_files" on storage.objects;
create policy "anon_delete_pengajuan_files"
on storage.objects for delete to anon
using (
    bucket_id = 'pengajuan-files'
    and (name like 'pengajuan/%' or name like 'rekomendasi/%' or name like 'penetapan/%')
);

-- Policy baca publik tidak berubah (file memang untuk dilihat/diunduh
-- peserta lewat tombol Preview/Unduh).

-- ------------------------------------------------------------
-- 3) VERIFIKASI (opsional, jalankan terpisah bila ingin lihat):
--    select column_name from information_schema.columns
--      where table_name = 'penetapan' and column_name = 'bukti_lulus_pt';
--    select policyname, cmd from pg_policies
--      where tablename = 'objects' and policyname like 'anon_%_pengajuan_files';
-- ------------------------------------------------------------
