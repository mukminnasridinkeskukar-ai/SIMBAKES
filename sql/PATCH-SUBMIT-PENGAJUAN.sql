-- ============================================================
-- PATCH-SUBMIT-PENGAJUAN.sql  (SIMBAKES)
-- Tanggal: 14 Oktober 2026
--
-- TUJUAN:
-- 1) Menjamin data pengajuan (termasuk dari akun peserta) PASTI
--    tersimpan di tabel `submissions` lewat RPC server-side
--    `app_submit_pengajuan` (security definer — kebal pergeseran
--    kebijakan RLS), dengan pencatatan identitas peserta dari
--    sesi server dan perlakuan aman untuk kirim ulang (idempotent).
-- 2) Menutup celah RLS: kebijakan lama hanya `TO anon`; bila request
--    membawa sesi auth lain, operasi bisa ditolak / hasil .select()
--    kosong (row tercommit tapi aplikasi menganggap gagal).
--    Kini select/insert juga diizinkan untuk `authenticated`.
-- 3) Alat PEMULIHAN data yang "hilang": file dokumen yang sudah
--    terupload ke Storage tetap ada walau row gagal tersimpan.
--    RPC `admin_recover_pengajuan_storage` menemukan folder file
--    yatim, dan `admin_restore_pengajuan_dari_storage` memulihkan
--    row-nya ke tabel submissions.
--
-- AMAN dijalankan berulang (idempotent).
-- Jalankan di: Supabase Dashboard → SQL Editor → Run.
-- ============================================================

-- ============================================================
-- 1) RPC SUBMIT PENGAJUAN (server-side, kebal RLS drift)
-- ============================================================
create or replace function public.app_submit_pengajuan(
    p_payload jsonb,
    p_token   text default null
)
returns jsonb
language plpgsql volatile security definer
set search_path = public, extensions, storage
as $$
declare
    v_reg        text;
    v_existing   public.submissions%rowtype;
    v_nik        text;
    v_nama       text;
    v_email      text;
    v_stamped    boolean := false;
    v_profile    jsonb;
    v_record     public.submissions%rowtype;
begin
    if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
        raise exception 'Payload pengajuan tidak valid';
    end if;

    v_reg := nullif(trim(coalesce(p_payload->>'no_register', '')), '');
    if v_reg is null then
        raise exception 'Nomor pengajuan (no_register) wajib ada';
    end if;

    -- ---- Identitas peserta dari sesi server (sumber kebenaran) ----
    -- Bila token peserta valid, NIK/nama/email diambil dari akun peserta
    -- (bukan percaya isian browser). Token kedaluwarsa diabaikan saja
    -- (jalur publik tetap boleh mengisi identitas sendiri).
    if p_token is not null and length(p_token) >= 32 then
        v_profile := public.app_validate_session(p_token);
        if v_profile is not null and v_profile->>'user_type' = 'peserta'
           and v_profile->'profile' is not null then
            v_nik    := nullif(trim(coalesce(v_profile->'profile'->>'nik', '')), '');
            v_nama   := nullif(trim(coalesce(v_profile->'profile'->>'nama', '')), '');
            v_email  := nullif(trim(coalesce(v_profile->'profile'->>'email', '')), '');
            if v_nik is not null then
                v_stamped := true;
            end if;
        end if;
    end if;

    -- ---- Idempotent: bila nomor sudah ada, kembalikan row lama ----
    -- (memungkinkan kirim-ulang antrean tanpa menduplikasi data)
    select * into v_existing
    from public.submissions where no_register = v_reg limit 1;
    if found then
        return jsonb_build_object(
            'ok', true, 'duplicate', true, 'stamped', false,
            'record', to_jsonb(v_existing)
        );
    end if;

    -- ---- Validasi minimum ----
    v_nik  := coalesce(v_nik,  nullif(trim(coalesce(p_payload->>'nik', '')), ''));
    v_nama := coalesce(v_nama, nullif(trim(coalesce(p_payload->>'nama_lengkap', '')), ''));
    if v_nama is null then
        raise exception 'Nama lengkap wajib diisi';
    end if;
    if v_nik is null or v_nik !~ '^\d{16}$' then
        raise exception 'NIK wajib 16 digit angka';
    end if;

    -- ---- Insert (whitelist kolom; security definer melewati RLS) ----
    insert into public.submissions (
        no_register, tanggal_pengajuan,
        nik, nama_lengkap, tempat_lahir, tanggal_lahir,
        alamat_ktp, alamat_domisili, lama_domisili,
        pekerjaan, posisi, unit_kerja, penjelasan,
        jurusan_tujuan, jenjang_pendidikan, unit_tujuan, rencana_tahun,
        no_hp, no_wa, email,
        foto_peserta, dokumen_kelengkapan,
        status, created_at, updated_at
    ) values (
        v_reg,
        coalesce(nullif(trim(coalesce(p_payload->>'tanggal_pengajuan','')), ''), current_date::text)::date,
        v_nik,
        v_nama,
        nullif(trim(coalesce(p_payload->>'tempat_lahir','')), ''),
        nullif(trim(coalesce(p_payload->>'tanggal_lahir','')), ''),
        nullif(trim(coalesce(p_payload->>'alamat_ktp','')), ''),
        nullif(trim(coalesce(p_payload->>'alamat_domisili','')), ''),
        nullif(trim(coalesce(p_payload->>'lama_domisili','')), ''),
        nullif(trim(coalesce(p_payload->>'pekerjaan','')), ''),
        nullif(trim(coalesce(p_payload->>'posisi','')), ''),
        nullif(trim(coalesce(p_payload->>'unit_kerja','')), ''),
        nullif(trim(coalesce(p_payload->>'penjelasan','')), ''),
        nullif(trim(coalesce(p_payload->>'jurusan_tujuan','')), ''),
        nullif(trim(coalesce(p_payload->>'jenjang_pendidikan','')), ''),
        nullif(trim(coalesce(p_payload->>'unit_tujuan','')), ''),
        nullif(trim(coalesce(p_payload->>'rencana_tahun','')), ''),
        nullif(trim(coalesce(p_payload->>'no_hp','')), ''),
        nullif(trim(coalesce(p_payload->>'no_wa','')), ''),
        coalesce(v_email, nullif(trim(coalesce(p_payload->>'email','')), '')),
        nullif(trim(coalesce(p_payload->>'foto_peserta','')), ''),
        nullif(trim(coalesce(p_payload->>'dokumen_kelengkapan','')), ''),
        coalesce(nullif(trim(coalesce(p_payload->>'status','')), ''), 'Proses Verifikasi'),
        now(), now()
    )
    returning * into v_record;

    return jsonb_build_object(
        'ok', true, 'duplicate', false, 'stamped', v_stamped,
        'record', to_jsonb(v_record)
    );
end;
$$;

-- ============================================================
-- 2) RLS: tutup celah role `authenticated` pada submissions
--    (kebijakan lama hanya TO anon; kebijakan admin update/delete
--     TIDAK diubah)
-- ============================================================
drop policy if exists "submissions_select_auth" on public.submissions;
drop policy if exists "submissions_insert_auth" on public.submissions;

create policy "submissions_select_auth"
    on public.submissions for select to authenticated using (true);
create policy "submissions_insert_auth"
    on public.submissions for insert to authenticated with check (true);

-- ============================================================
-- 3) PEMULIHAN: daftar file yatim di Storage (folder pengajuan/
--    <no_register>/ yang tidak punya row di submissions)
-- ============================================================
create or replace function public.admin_recover_pengajuan_storage()
returns table (
    reg           text,
    jumlah_file   bigint,
    files         jsonb,
    waktu_upload  timestamptz,
    ada_di_tabel  boolean
)
language plpgsql stable security definer
set search_path = public, extensions, storage
as $$
begin
    -- Hanya admin/operator (sesi 'write') lewat header x-session-token
    if not coalesce(public.app_is_valid_session('write'), false) then
        raise exception 'Hanya admin/operator yang dapat memulihkan data';
    end if;

    return query
    with obj as (
        select
            split_part(o.name, '/', 2) as reg,
            o.name,
            o.created_at,
            coalesce((o.metadata->>'size')::bigint, 0) as ukuran
        from storage.objects o
        where o.bucket_id = 'pengajuan-files'
          and o.name like 'pengajuan/%/%'
          and length(split_part(o.name, '/', 2)) >= 3
    ),
    agg as (
        select reg,
               count(*)::bigint as jumlah_file,
               jsonb_agg(
                   jsonb_build_object('path', name, 'ukuran', ukuran, 'jenis', split_part(name, '/', 3))
                   order by name
               ) as files,
               min(created_at) as waktu_upload
        from obj
        group by reg
    )
    select a.reg, a.jumlah_file, a.files, a.waktu_upload,
           (s.id is not null) as ada_di_tabel
    from agg a
    left join public.submissions s on s.no_register = a.reg
    order by (s.id is not null) asc, a.waktu_upload desc;
end;
$$;

-- ============================================================
-- 4) PEMULIHAN: pulihkan 1 row dari file Storage ke tabel
--    (data teks seperti nama/NIK tidak dapat dibangun dari file —
--     admin melengkapinya dari bukti daftar kertas/scan)
-- ============================================================
create or replace function public.admin_restore_pengajuan_dari_storage(p_reg text)
returns jsonb
language plpgsql volatile security definer
set search_path = public, extensions, storage
as $$
declare
    v_reg        text := nullif(trim(coalesce(p_reg, '')), '');
    v_existing   public.submissions%rowtype;
    v_foto       text;
    v_dok        text;
    v_created    timestamptz;
    v_record     public.submissions%rowtype;
begin
    if not coalesce(public.app_is_valid_session('write'), false) then
        raise exception 'Hanya admin/operator yang dapat memulihkan data';
    end if;
    if v_reg is null or v_reg ~ '[^A-Za-z0-9_-]' then
        raise exception 'Nomor register tidak valid';
    end if;

    -- Sudah ada? -> kembalikan row yang ada (idempotent)
    select * into v_existing from public.submissions
    where no_register = v_reg limit 1;
    if found then
        return jsonb_build_object('ok', true, 'sudah_ada', true, 'record', to_jsonb(v_existing));
    end if;

    select min(created_at) into v_created
    from storage.objects
    where bucket_id = 'pengajuan-files'
      and name like 'pengajuan/' || v_reg || '/%';

    -- Foto pasfoto: file pertama berawalan "foto-"
    select 'pengajuan/' || v_reg || '/' || split_part(o.name, '/', 3)
      into v_foto
    from storage.objects o
    where o.bucket_id = 'pengajuan-files'
      and o.name like 'pengajuan/' || v_reg || '/foto-%'
    order by o.created_at asc limit 1;

    -- Dokumen kelengkapan: gabungan URL dokumen-* dan surat-* (per baris)
    select string_agg(
               'pengajuan/' || v_reg || '/' || split_part(o.name, '/', 3),
               E'\n' order by o.created_at
           )
      into v_dok
    from storage.objects o
    where o.bucket_id = 'pengajuan-files'
      and (o.name like 'pengajuan/' || v_reg || '/dokumen-%'
           or o.name like 'pengajuan/' || v_reg || '/surat-%');

    insert into public.submissions (
        no_register, foto_peserta, dokumen_kelengkapan,
        status, tanggal_pengajuan, created_at, updated_at
    ) values (
        v_reg, v_foto, v_dok,
        'Proses Verifikasi',
        coalesce(v_created::date, current_date),
        coalesce(v_created, now()), now()
    )
    returning * into v_record;

    return jsonb_build_object('ok', true, 'sudah_ada', false, 'record', to_jsonb(v_record));
end;
$$;

-- ============================================================
-- 5) IZIN EKSEKUSI
-- ============================================================
grant execute on function public.app_submit_pengajuan(jsonb, text)            to anon;
grant execute on function public.admin_recover_pengajuan_storage()            to anon;
grant execute on function public.admin_restore_pengajuan_dari_storage(text)   to anon;

-- ============================================================
-- 6) VERIFIKASI (hasil muncul setelah Run)
-- ============================================================
select 'app_submit_pengajuan'                    as objek, 'RPC simpan pengajuan (server-side, idempotent)' as keterangan
union all select 'submissions_select_auth',      'RLS select untuk authenticated'
union all select 'submissions_insert_auth',      'RLS insert untuk authenticated'
union all select 'admin_recover_pengajuan_storage',      'RPC daftar file yatim di Storage (admin)'
union all select 'admin_restore_pengajuan_dari_storage', 'RPC pulihkan row dari Storage (admin)';

-- Cek kebijakan RLS aktif pada submissions (diagnostik):
-- select policyname, cmd, roles, qual, with_check
--   from pg_policies where tablename = 'submissions';

-- Cek keberadaan kolom penting (diagnostik):
-- select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='submissions'
--     and column_name in ('no_register','nik','nama_lengkap','foto_peserta',
--                         'dokumen_kelengkapan','status');

-- ============================================================
-- SELESAI.
-- Catatan: URL publik file = <SUPABASE_URL>/storage/v1/object/
--          public/pengajuan-files/<path> — panel admin membangun
--          otomatis pada tombol "Pulihkan Data".
-- ============================================================
