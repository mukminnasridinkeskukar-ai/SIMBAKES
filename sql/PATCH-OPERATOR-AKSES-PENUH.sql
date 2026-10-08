-- ============================================================
-- SIMBAKES — PATCH: OPERATOR AKSES PENUH (DATA PENGUSULAN & DATA AKUN PESERTA)
-- ============================================================
-- Jalankan SEKALI di Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- Latar belakang:
--   Secara MENU (sisi aplikasi) operator memang hanya melihat 2 menu:
--   "Data Pengusulan" dan "Data Akun Peserta". Namun di sisi SERVER masih
--   ada 3 gerbang yang menolak operator, sehingga aksesnya BELUM penuh:
--     1. RLS delete tabel submissions  -> hanya superadmin
--        (tombol "Hapus Data" operator gagal menghapus data pengusulan)
--     2. RPC admin_save_akun_peserta   -> hanya superadmin/admin
--        (operator gagal menambah/mengedit akun peserta)
--     3. RPC admin_delete_akun_peserta -> hanya superadmin/admin
--        (operator gagal menghapus akun peserta)
--
-- Patch ini membuka 3 gerbang tersebut untuk role 'operator'.
-- Role viewer/observer TETAP ditolak (mereka tidak punya akses kedua
-- menu ini, dan tidak termasuk tangga sesi 'write').
--
-- Aman dijalankan berulang (idempotent — create or replace / drop+create).
-- ============================================================

-- ============================================================
-- 1) RLS submissions: izinkan HAPUS data pengusulan oleh operator
--    Tangga 'write' = superadmin / operator / admin (admin dinormalisasi
--    menjadi superadmin). viewer/observer tetap ditolak.
-- ============================================================
drop policy if exists "submissions_delete_admin" on public.submissions;
create policy "submissions_delete_admin"
    on public.submissions for delete to anon
    using (public.app_is_valid_session('write'));

-- ============================================================
-- 2) RPC admin_save_akun_peserta: tambahkan 'operator'
--    (logika fungsi sama persis dengan SECURITY-HARDENING.sql,
--     hanya gerbang role yang diperluas)
-- ============================================================
create or replace function public.admin_save_akun_peserta(p_token text, p_record jsonb)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
    v_role  text;
    v_rec   jsonb := p_record;
    v_id    text;
    v_pass  text;
    v_out   record;
begin
    -- Wajib sesi admin valid dengan hak tulis (superadmin / operator / admin)
    if not public.app_is_valid_session('write') then
        raise exception 'Akses ditolak: sesi tidak valid';
    end if;
    select role into v_role from public.app_sessions
    where token_hash = encode(digest(p_token, 'sha256'), 'hex') and revoked = false and expires_at > now()
    limit 1;
    if v_role not in ('superadmin','admin','operator') then
        raise exception 'Akses ditolak: role tidak berwenang';
    end if;

    v_id   := v_rec->>'id';
    v_pass := nullif(v_rec->>'password', '');

    if v_id is null or v_id = '' then
        -- INSERT akun baru
        if v_pass is null or length(v_pass) < 8 then
            raise exception 'Password minimal 8 karakter';
        end if;
        insert into public.akun_peserta
            (nama, nik, email, username, jurusan_tujuan, status, status_note,
             approved_at, password, password_hash)
        values (
            v_rec->>'nama', v_rec->>'nik', lower(v_rec->>'email'), lower(v_rec->>'username'),
            v_rec->>'jurusan_tujuan',
            coalesce(v_rec->>'status', 'pending'),
            v_rec->>'status_note',
            case when coalesce(v_rec->>'status','pending') = 'approved' then now() else null end,
            '',                                        -- kolom password NOT NULL: isi ''
            crypt(v_pass, gen_salt('bf', 10))          -- hash dibuat di server
        )
        returning * into v_out;
    else
        -- UPDATE akun (password opsional)
        update public.akun_peserta set
            nama            = coalesce(v_rec->>'nama', nama),
            nik             = coalesce(v_rec->>'nik', nik),
            email           = coalesce(lower(v_rec->>'email'), email),
            username        = coalesce(lower(v_rec->>'username'), username),
            jurusan_tujuan  = coalesce(v_rec->>'jurusan_tujuan', jurusan_tujuan),
            status          = coalesce(v_rec->>'status', status),
            status_note     = coalesce(v_rec->>'status_note', status_note),
            approved_at     = case when v_rec->>'status' = 'approved' then coalesce(approved_at, now()) else approved_at end,
            password_hash   = case
                                when v_pass is not null then crypt(v_pass, gen_salt('bf', 10))
                                else password_hash end,
            password        = case when v_pass is not null then '' else password end
        where id::text = v_id
        returning * into v_out;

        if not found then
            raise exception 'Akun tidak ditemukan';
        end if;
    end if;

    return jsonb_build_object('ok', true, 'id', v_out.id::text);
end;
$$;

-- ============================================================
-- 3) RPC admin_delete_akun_peserta: tambahkan 'operator'
-- ============================================================
create or replace function public.admin_delete_akun_peserta(p_token text, p_id text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
    v_role text;
begin
    if not public.app_is_valid_session('write') then
        raise exception 'Akses ditolak: sesi tidak valid';
    end if;
    select role into v_role from public.app_sessions
    where token_hash = encode(digest(p_token, 'sha256'), 'hex') and revoked = false and expires_at > now()
    limit 1;
    if v_role not in ('superadmin','admin','operator') then
        raise exception 'Akses ditolak: role tidak berwenang';
    end if;

    delete from public.akun_peserta where id::text = p_id;
    if not found then
        raise exception 'Akun tidak ditemukan';
    end if;
    return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
-- VERIFIKASI (jalankan terpisah bila ingin memastikan)
-- ============================================================
-- 1) Policy delete submissions kini memakai tangga 'write':
--    select policyname, cmd, qual from pg_policies
--      where tablename = 'submissions' and policyname = 'submissions_delete_admin';
--    -> qual mengandung app_is_valid_session('write')
--
-- 2) Kedua RPC sudah versi terbaru (berisi 'operator'):
--    select proname, prosrc from pg_proc
--      where proname in ('admin_save_akun_peserta','admin_delete_akun_peserta');
--    -> prosrc mengandung ('superadmin','admin','operator')
--
-- Hasil yang diharapkan: operator dapat menghapus data pengusulan serta
-- menambah/mengedit/menghapus akun peserta lewat Panel Admin.
-- ============================================================
