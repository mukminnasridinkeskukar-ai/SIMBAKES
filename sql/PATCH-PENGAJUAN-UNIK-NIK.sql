-- ============================================================
-- SIMBAKES — PATCH: ANTI DATA GANDA MENU PENGAJUAN (1 NIK = 1 DATA)
-- (REVISI 15 OKT l)
-- ============================================================
-- Tujuan: menu Data Pengajuan/Pengusulan TIDAK BOLEH menampilkan
-- data ganda — satu NIK hanya boleh memiliki SATU baris pengajuan.
--
-- Isi patch:
--   1. Normalisasi NIK (buang spasi di awal/akhir).
--   2. Bersihkan data ganda yang sudah ada: per NIK disimpan hanya
--      SATU baris yaitu yang TERBARU (created_at terbesar; bila sama,
--      id terbesar). Baris lama dihapus.
--   3. Pasang constraint UNIK pada kolom nik — duplikat baru DITOLAK
--      langsung oleh database (jaga-jaga terakhir setelah guard di
--      aplikasi: form peserta, Tambah Data admin, dan Edit admin).
--
-- Catatan aman:
--   - Tidak ada tabel lain yang ber-FK ke submissions (sudah diperiksa),
--      jadi penghapusan duplikat tidak merusak relasi.
--   - Baris dengan nik kosong/NULL tidak disentuh & tidak diindeks.
--
-- Cara pakai : Supabase Dashboard → SQL Editor → New query →
--              paste seluruh isi file ini → Run.
-- Idempotent : aman dijalankan berulang kali.
-- ============================================================

-- ---------- 1. Normalisasi NIK (trim; kosong -> NULL) ----------
UPDATE public.submissions
SET nik = trim(nik)
WHERE nik IS NOT NULL AND nik <> trim(nik);

UPDATE public.submissions
SET nik = NULL
WHERE nik = '';

-- ---------- 2. Hapus data ganda lama (simpan 1 terbaru per NIK) ----------
DO $$
DECLARE
    v_dihapus integer;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'submissions') THEN
        WITH dup AS (
            SELECT id,
                   row_number() OVER (
                       PARTITION BY nik
                       ORDER BY created_at DESC NULLS LAST, id DESC
                   ) AS rn
            FROM public.submissions
            WHERE nik IS NOT NULL AND nik <> ''
        )
        DELETE FROM public.submissions s
        USING dup d
        WHERE s.id = d.id AND d.rn > 1;

        GET DIAGNOSTICS v_dihapus = ROW_COUNT;
        IF v_dihapus > 0 THEN
            RAISE NOTICE 'Pembersihan data ganda: % baris duplikat dihapus (1 NIK = 1 data terbaru).', v_dihapus;
        ELSE
            RAISE NOTICE 'Tidak ada data ganda — database sudah bersih.';
        END IF;
    END IF;
END $$;

-- ---------- 3. Constraint UNIK pada nik (penolakan level database) ----------
-- Constraint menolak duplikat untuk SEMUA NIK terisi. Baris dengan nik
-- NULL (belum diisi) tetap boleh lebih dari satu — Postgres memperbolehkan
-- banyak NULL pada constraint unik.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'submissions_nik_unik'
          AND conrelid = 'public.submissions'::regclass
    ) THEN
        -- Bila masih ada duplikat (mis. file ini dijalankan terpisah dari
        -- langkah 2), pembuatan constraint GAGAL dengan pesan jelas —
        -- jalankan ulang file ini: langkah 2 membersihkan, lalu constraint
        -- terpasang otomatis.
        ALTER TABLE public.submissions
            ADD CONSTRAINT submissions_nik_unik
            UNIQUE (nik);
        RAISE NOTICE 'Constraint unik submissions_nik_unik berhasil dipasang.';
    ELSE
        RAISE NOTICE 'Constraint unik submissions_nik_unik sudah ada — lewati.';
    END IF;
EXCEPTION
    WHEN unique_violation THEN
        RAISE WARNING 'Masih ada data ganda NIK di tabel submissions. Jalankan ulang patch ini (langkah 2 akan membersihkan), lalu constraint terpasang otomatis.';
END $$;

DO $$
BEGIN
    RAISE NOTICE 'SELESAI: anti data ganda menu Pengajuan aktif (1 NIK = 1 data).';
END $$;
