-- ============================================================
-- [Task9e] OPSIONAL — Penguatan server-side nomor pengajuan
-- ============================================================
-- Latar: kolom no_register pada tabel submissions BELUM punya
-- constraint UNIQUE (terverifikasi 2026-09-10 via uji REST:
-- insert duplikat berhasil). Aplikasi sudah melakukan pengecekan
-- unik sebelum insert (ensureUniqueRegNumber), namun indeks unik
-- di database memberi jaminan mutlak anti-duplikat meski dua
-- pengguna mengirim bersamaan di detik yang sama.
--
-- CARA PAKAI:
--   1. Buka Supabase Dashboard -> SQL Editor
--   2. Paste seluruh isi file ini -> Run
--
-- Catatan aman:
--   - Postgres mengizinkan BANYAK baris NULL pada indeks unik,
--     sehingga 58 baris import lama yang no_register-nya NULL
--     TIDAK akan bermasalah.
--   - Jika run pertama gagal karena sudah ada duplikat no_register
--     (data lama), jalankan query pemeriksaan duplikat di bawah
--     dulu, rapikan, lalu run lagi.
-- ============================================================

-- (a) Cek duplikat dulu (opsional, read-only):
-- SELECT no_register, COUNT(*) FROM submissions
--  WHERE no_register IS NOT NULL
--  GROUP BY no_register HAVING COUNT(*) > 1;

-- (b) Buat indeks unik:
CREATE UNIQUE INDEX IF NOT EXISTS submissions_no_register_unique_idx
    ON submissions (no_register);
