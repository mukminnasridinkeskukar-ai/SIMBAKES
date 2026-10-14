-- ============================================================
-- CLEANUP-QUOTA.sql  (SIMBAKES) — [Revisi 15 Okt]
-- PEMELIHARAAN BERKALA KUOTA DATABASE
--
-- UNTUK APA:
--   Menjaga pemakaian disk database Supabase tetap JAUH dari
--   ambang kunci baca-saja (~95% dari kuota, Free = 500 MB).
--   Bila disk menyentuh ambang itu, Supabase OTOMATIS mengunci
--   database menjadi mode baca-saja dan pengajuan peserta gagal
--   tersimpan. Skrip ini membersihkan sampah data paling umum
--   (sesi login mati) SEBELUM itu terjadi.
--
-- KAPAN DIJALANKAN:
--   • Rutin: 1–2 minggu sekali (cukup 1 menit), dan/atau
--   • Saat Usage → Database Size mulai mendekati 60–80%.
--
-- AMAN DIJALANKAN BERULANG (idempotent). Yang dihapus HANYA:
--   • sesi login kedaluwarsa / dicabut (tabel app_sessions).
--   TIDAK menyentuh: submissions, akun_peserta, multiusers,
--   dan file Storage — data layanan tidak akan terhapus.
--
-- CARA PAKAI: Supabase Dashboard → SQL Editor → paste semua → Run.
--   Baca hasil NOTICES di panel hasil ("Running ... Results").
-- ============================================================

-- ============================================================
-- BAGIAN A — LAPORAN KONDISI (read-only, aman walau sedang
--            mode baca-saja sekalipun)
-- ============================================================

-- A1. Status database sekarang:
--     off = normal ✅   |   on = MODE BACA-SAJA (terkunci kuota) ⛔
show default_transaction_read_only;

-- A2. Ukuran database (bandingkan dengan kuota, Free = 500 MB):
select pg_size_pretty(pg_database_size(current_database())) as ukuran_database;

-- A3. 10 tabel terbesar + "baris mati" (n_dead_tup — sampah yang
--     belum diresapi; inilah yang sering membesarkan disk diam-diam):
select relname as tabel,
       pg_size_pretty(pg_total_relation_size(relid)) as ukuran_total,
       n_live_tup as baris_aktif,
       n_dead_tup as baris_mati
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 10;

-- A4. Pemakaian Storage (file) per bucket — kuota terpisah, Free = 1 GB:
select bucket_id,
       count(*) as jumlah_file,
       pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as total_ukuran
from storage.objects
group by bucket_id
order by coalesce(sum((metadata->>'size')::bigint), 0) desc;

-- A5. Statistik sesi login (bahan yang akan dibersihkan Bagian B):
select count(*)                                as total_sesi,
       count(*) filter (where expires_at < now())  as kadaluarsa,
       count(*) filter (where revoked)             as dicabut
from public.app_sessions;

-- ============================================================
-- BAGIAN B — PEMBERSIHAN SESI MATI (butuh mode tulis)
--   Bila database masih read-only, bagian ini MENGHENTIKAN DIRI
--   dengan pesan jelas (tidak ada setengah jalan).
-- ============================================================
do $$
declare
    v_read_only text;
    v_hapus     bigint := 0;
    v_gagal     text   := null;
begin
    v_read_only := coalesce(current_setting('transaction_read_only', true), 'off');
    if v_read_only = 'on' then
        raise notice '⛔ Database masih MODE BACA-SAJA — pembersihan DILEWATI.';
        raise notice '   Obat: bebaskan kuota lewat Dashboard Supabase';
        raise notice '   (panduan lengkap: sql/DIAG-READ-ONLY.sql butir 5),';
        raise notice '   lalu jalankan CLEANUP-QUOTA.sql ini SEKALI LAGI setelah normal.';
        return;
    end if;

    begin
        -- Predikat sama persis dengan app_purge_expired_sessions()
        -- (sql/SECURITY-HARDENING.sql) — hanya sesi mati:
        delete from public.app_sessions
        where expires_at < now() - interval '1 day'
           or revoked = true;
        get diagnostics v_hapus = row_count;
    exception when others then
        v_gagal := sqlerrm;
    end;

    if v_gagal is not null then
        raise notice '❌ Pembersihan sesi gagal: %', v_gagal;
        raise notice '   (Bila pesannya read-only transaction → lihat catatan Bagian B atas.)';
    elsif v_hapus = 0 then
        raise notice '✅ Tidak ada sesi mati — database sudah bersih.';
    else
        raise notice '✅ Sesi login mati dihapus: % baris.', v_hapus;
    end if;
end $$;

-- Hasil setelah pembersihan (bandingkan dengan A5):
select count(*)                                as sisa_sesi_aktif,
       count(*) filter (where expires_at < now())  as sisa_kadaluarsa_hplus_1hari
from public.app_sessions;

-- ============================================================
-- BAGIAN C — KANDIDAT FILE YATIM DI STORAGE (laporan saja,
--            TIDAK ada yang dihapus otomatis)
--   File yatim = folder pengajuan/<nomor>/ tanpa baris di tabel
--   submissions (mis. terjadi saat database sempat read-only).
--   JANGAN dihapus langsung — data pengajuan bisa selamat:
--   1) Buka SIMBAKES admin → Data Pengusulan → "🛟 Pulihkan Data"
--      untuk mengembalikan row-nya ke tabel;
--   2) Baru hapus sisa yang benar-benar tak terpakai lewat
--      Dashboard → Storage → bucket pengajuan-files.
-- ============================================================
with obj as (
    select split_part(o.name, '/', 2) as reg,
           count(*)::int              as jumlah_file,
           pg_size_pretty(coalesce(sum((o.metadata->>'size')::bigint), 0)) as ukuran,
           min(o.created_at)          as waktu_upload
    from storage.objects o
    where o.bucket_id = 'pengajuan-files'
      and o.name like 'pengajuan/%/%'
    group by 1
)
select o.reg,
       o.jumlah_file,
       o.ukuran,
       o.waktu_upload,
       (s.id is not null) as ada_di_tabel      -- false = kandidat yatim
from obj o
left join public.submissions s on s.no_register = o.reg
order by (s.id is not null) asc, o.waktu_upload desc
limit 50;

-- ============================================================
-- BAGIAN D — KEMBALIKAN RUANG DISK (WAJIB Run TERPISAH)
-- ============================================================
-- Menghapus baris TIDAK langsung mengecilkan ukuran disk — ruangnya
-- baru benar-benar bebas setelah VACUUM. Perintah VACUUM TIDAK BOLEH
-- berada dalam transaksi, sedangkan SQL Editor menjalankan seluruh
-- skrip ini sebagai satu transaksi — maka VACUUM sengaja DIKOMENTARI.
--
-- CARA: salin baris di bawah ini ke tab SQL Editor BARU → Run sekali.
--
-- vacuum (analyze) public.app_sessions;
--
-- Baris lanjutan (opsional, hanya bila laporan A3 menunjukkan tabel
-- lain membengkak):  vacuum (analyze) public.submissions;
--
-- CATATAN:
-- • vacuum (analyze) cepat & TIDAK mengunci lama — aman saat layanan
--   berjalan. Sedangkan `vacuum full` mengunci tabel penuh beberapa
--   saat — hanya bila benar-benar darurat dan layanan boleh jeda.
-- • Angka Usage di Dashboard bisa tertinggal sampai ±1 jam; dan
--   "Log Ingestion/Log Query" adalah log platform Supabase yang
--   diurus otomatis (kedaluwarsa sendiri) — tidak perlu dibersihkan.
-- ============================================================
-- SELESAI — ulangi 1–2 minggu sekali. Bila ukuran database tetap
-- naik terus walau sudah bersih, data asli memang bertambah:
-- pertimbangkan penghapusan data lama yang disetujui, atau upgrade.
-- ============================================================
