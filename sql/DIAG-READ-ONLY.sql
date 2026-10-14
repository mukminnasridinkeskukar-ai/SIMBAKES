-- ============================================================
-- DIAG-READ-ONLY.sql  (SIMBAKES) — [Revisi 14 Okt b]
-- DIAGNOSTIK: "cannot execute UPDATE in a read-only transaction"
--
-- GEJALA DI APLIKASI:
--   • Data pengajuan peserta gagal tersimpan (tapi bukti daftar terbit).
--   • Tombol "🛟 Pulihkan Data" → "Gagal memindai Storage:
--     cannot execute UPDATE in a read-only transaction" (HTTP 405).
--
-- PENYEBAB:
--   Supabase OTOMATIS mengunci database menjadi MODE BACA-SAJA
--   ketika pemakaian disk mendekati/mencapai batas kuota (~95%).
--   Semua INSERT/UPDATE/DELETE ditolak; SELECT tetap normal.
--   Ini BUKAN bug aplikasi dan TIDAK ada data yang hilang:
--   • file dokumen tetap ada di Storage (bucket pengajuan-files),
--   • pengajuan yang gagal kirim tersimpan di perangkat pelapor
--     (antrean pemulihan) dan terkirim otomatis begitu mode normal.
--
-- CARA PAKAI: jalankan seluruh skrip ini di Supabase SQL Editor.
--   Semua perintahnya SELECT/SHOW — aman dijalankan WALAUPUN
--   database sedang read-only. Hasilnya menjelaskan status & obatnya.
-- ============================================================

-- ============================================================
-- 1) STATUS READ-ONLY?  ← PALING PENTING
-- ============================================================
-- off = normal   |   on = MODE BACA-SAJA (terkunci kuota disk)
show default_transaction_read_only;

-- Konfirmasi lewat percobaan tulis TANPA EFEK (update 0 baris lalu
-- di-rollback). Bila muncul error 25006 "cannot execute UPDATE in a
-- read-only transaction" → terbukti database sedang read-only:
begin;
update public.app_sessions set last_seen_at = last_seen_at where false;
rollback;

-- ============================================================
-- 2) SEBESAR APA KUOTA TERPAKAI?
-- ============================================================
-- Ukuran database (bandingkan dengan kuota paket Anda,
-- mis. Free = 500 MB, Pro = 8 GB per proyek):
select pg_size_pretty(pg_database_size(current_database())) as ukuran_database;

-- 10 tabel terbesar (kandidat pembersihan):
select relname as tabel,
       pg_size_pretty(pg_total_relation_size(relid)) as ukuran,
       n_live_tup as jumlah_baris
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 10;

-- Ukuran tablespace dasar (disk yang dipakai instance):
select pg_size_pretty(pg_tablespace_size('pg_default')) as ukuran_disk_instance;

-- ============================================================
-- 3) APAKAH YANG MEMBESARKAN: file Storage?
--    (Storage dihitung terpisah dari disk database, tapi tetap
--     bagian kuota proyek — cek juga di Dashboard → Storage)
-- ============================================================
select bucket_id,
       count(*) as jumlah_file,
       pg_size_pretty(sum((metadata->>'size')::bigint)::bigint) as total_ukuran
from storage.objects
group by bucket_id
order by sum((metadata->>'size')::bigint) desc nulls last;

-- ============================================================
-- 4) SESI TERSANGKA: app_sessions menumpuk?
--    (setiap validasi sesi memperbarui baris sesi; tabel ini
--     bisa dibersihkan dengan aman sesekali)
-- ============================================================
select count(*) as total_sesi,
       count(*) filter (where revoked) as sesi_dicabut,
       count(*) filter (where expires_at < now()) as sesi_kadaluarsa
from public.app_sessions;

-- ============================================================
-- 5) CARA MENGEMBALIKAN MODE NORMAL (lakukan di DASHBOARD,
--    bukan lewat SQL — server yang mengunci, server juga yang
--    melepas kuncinya setelah ruang tersedia):
--
--    a) Dashboard Supabase → cek banner merah/kuning
--       "Your database is in read-only mode" di beranda proyek.
--    b) Free up disk space — pilih salah satu / kombinasi:
--       • Database → Backups → hapus backup lama yang tak dipakai
--         (di beberapa paket backup otomatis tidak bisa dihapus,
--          lanjut ke opsi berikutnya),
--       • hapus/barangi data besar (lihat hasil butir 2 di atas —
--         mis. tabel log/riwayat lama, sesi kadaluarsa:
--         select public.app_purge_expired_sessions();),
--       • Storage → hapus file tak terpakai (lihat butir 3),
--       • atau Upgrade plan (Settings → Billing) untuk menambah disk.
--    c) Tunggu 1–5 menit. Banner read-only hilang sendiri dan
--       tulisan "show default_transaction_read_only" kembali "off".
--       (Supabase melepas kunci otomatis begitu ruang tersedia.)
--    d) Muat ulang aplikasi SIMBAKES, lalu:
--       • tombol "🛟 Pulihkan Data" akan memindai normal kembali,
--       • pengajuan tertunda di perangkat peserta terkirim otomatis.
--
--    CATATAN: `ALTER SYSTEM SET default_transaction_read_only = off`
--    TIDAK dapat dipakai (ditolak saat read-only, dan di Supabase
--    kunci ini dikelola platform, bukan lewat SQL).
-- ============================================================

-- ============================================================
-- 6) PEMBERSIHAN AMAN CEPAT (opsional, jalankan bila butir 2
--    menunjukkan app_sessions besar; aman walau read-only sudah
--    terlanjur — jalankan setelah mode normal untuk efek penuh):
-- ============================================================
-- select public.app_purge_expired_sessions();  -- hapus sesi mati
-- vacuum full public.app_sessions;             -- kembalikan ruang disk

-- ============================================================
-- SELESAI — kirim hasil butir 1 & 2 ke admin bila butuh bantuan.
-- ============================================================
