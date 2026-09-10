-- ============================================================
-- SIMBAKES [Task9f] — SETUP STORAGE UNTUK UPLOAD DOKUMEN PENGAJUAN
-- ============================================================
-- Jalankan SEKALI di Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- Fungsi:
--   1. Membuat bucket publik 'pengajuan-files' (foto & PDF pengajuan)
--   2. Mengizinkan pengunjung (anon) mengupload file ke bucket itu
--   3. Mengizinkan semua orang membaca file (untuk pratinjau & panel admin)
--
-- Aman dijalankan berulang (idempotent).
-- ============================================================

-- 1) Buat bucket 'pengajuan-files' (public), batas ukuran 10 MB per file
insert into storage.buckets (id, name, public, file_size_limit)
values ('pengajuan-files', 'pengajuan-files', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;

-- 2) Izinkan pengunjung upload file ke bucket ini (INSERT)
drop policy if exists "anon_upload_pengajuan_files" on storage.objects;
create policy "anon_upload_pengajuan_files"
on storage.objects for insert to anon
with check (bucket_id = 'pengajuan-files');

-- 3) Izinkan pengunjung memperbarui/mengganti file miliknya (UPDATE, opsional)
drop policy if exists "anon_update_pengajuan_files" on storage.objects;
create policy "anon_update_pengajuan_files"
on storage.objects for update to anon
using (bucket_id = 'pengajuan-files');

-- 4) Izinkan semua orang membaca file (SELECT) — pratinjau & admin
drop policy if exists "public_read_pengajuan_files" on storage.objects;
create policy "public_read_pengajuan_files"
on storage.objects for select
using (bucket_id = 'pengajuan-files');

-- ============================================================
-- VERIFIKASI (opsional): jalankan terpisah bila ingin memastikan
--   select id, name, public, file_size_limit from storage.buckets
--     where id = 'pengajuan-files';
--   select policyname, cmd from pg_policies
--     where schemaname = 'storage' and tablename = 'objects'
--       and policyname like '%pengajuan_files%';
-- Hasil yang diharapkan: 1 bucket + 3 policy.
-- ============================================================
