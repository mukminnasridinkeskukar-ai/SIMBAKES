-- ============================================================
-- SIMBAKES — PATCH: BIODATA PESERTA (VIEW-ONLY) + AJUKAN SEKALI PER NIK
-- [Revisi 15 Okt g]
-- ============================================================
-- Permintaan:
--   1) Kartu "Biodata" di Portal Peserta: seluruh data pribadi peserta
--      yang sama dengan menu Data Pengajuan — tampil cantik, VIEW SAJA.
--   2) Formulir Ajukan hanya bisa diisi SATU KALI per peserta;
--      ada notifikasi pada bagian NIK bahwa data sudah pernah diinput.
--
-- Isi patch (idempotent — aman dijalankan berulang):
--   1) RPC  peserta_get_biodata(p_token)  — data biodata milik sendiri
--      (sesi divalidasi server; NIK akun dipakai mencari pengajuan).
--   2) Replace app_submit_pengajuan — TAMBAHAN penjaga "satu NIK satu
--      pengajuan": NIK yang sudah punya row submissions (dengan nomor
--      register BERBEDA) ditolak. Kirim-ulang antrean (no_register SAMA)
--      tetap lolos lewat jalur idempotent yang sudah ada.
--   3) Grant + verifikasi.
--
-- TIDAK ada perubahan struktur tabel / RLS lama.
-- ============================================================

-- ============================================================
-- 1) RPC PESERTA: BIODATA SENDIRI (VIEW-ONLY)
--    Mengembalikan data akun + pengajuan terakhir yang NIK-nya sama
--    dengan NIK akun peserta pemilik sesi. Hanya pemilik sesi —
--    tidak mungkin melihat biodata peserta lain.
-- ============================================================
create or replace function public.peserta_get_biodata(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_session public.app_sessions%rowtype;
    v_akun    public.akun_peserta%rowtype;
    v_sub     public.submissions%rowtype;
begin
    if p_token is null or length(p_token) < 32 then
        raise exception 'Akses ditolak: sesi tidak valid';
    end if;

    select * into v_session
    from public.app_sessions
    where token_hash = encode(digest(p_token, 'sha256'), 'hex')
      and revoked = false and expires_at > now()
    limit 1;

    if not found or v_session.user_type <> 'peserta' then
        raise exception 'Akses ditolak: sesi peserta tidak valid';
    end if;

    select * into v_akun from public.akun_peserta
    where id::text = v_session.user_id limit 1;
    if not found then
        raise exception 'Akun peserta tidak ditemukan';
    end if;

    -- Pengajuan milik sendiri: NIK akun = NIK pengajuan (terbaru)
    if coalesce(v_akun.nik, '') <> '' then
        select * into v_sub
        from public.submissions
        where nik = v_akun.nik
        order by coalesce(created_at, updated_at) desc nulls last, id desc
        limit 1;
    end if;

    return jsonb_build_object(
        'ok', true,
        'akun', jsonb_build_object(
            'id',            v_akun.id::text,
            'nama',          v_akun.nama,
            'nik',           v_akun.nik,
            'email',         v_akun.email,
            'username',      v_akun.username,
            'foto_url',      v_akun.foto_url,
            'status',        v_akun.status,
            'jurusan_tujuan',v_akun.jurusan_tujuan,
            'user_type',     'peserta'
        ),
        'sudah_ajukan', (v_sub.id is not null),
        'pengajuan', case when v_sub.id is not null then to_jsonb(v_sub) else null end
    );
end;
$$;

grant execute on function public.peserta_get_biodata(text) to anon;

-- ============================================================
-- 2) REPLACE app_submit_pengajuan — TAMBAH PENJAGA "SATU NIK SATU PENGAJUAN"
--    Perubahan HANYA blok penjaga baru (ditandai [Revisi 15 Okt g]);
--    perilaku lain (stamping identitas, idempotent no_register utk
--    antrean kirim-ulang, whitelist kolom) TIDAK diubah.
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
    v_dup_reg    text;
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

    -- ---- [Revisi 15 Okt g] SATU NIK SATU PENGAJUAN ----
    -- NIK yang sudah memiliki pengajuan dengan nomor register BERBEDA
    -- ditolak. Kirim-ulang antrean (no_register SAMA) tidak pernah
    -- sampai ke sini — sudah ditangani blok idempotent di atas.
    select s.no_register into v_dup_reg
    from public.submissions s
    where s.nik = v_nik and s.no_register <> v_reg
    order by coalesce(s.created_at, s.updated_at) desc nulls last, s.id desc
    limit 1;
    if found then
        raise exception 'NIK ini sudah pernah diinput pengajuan (No. Register %). Satu peserta hanya boleh mengisi formulir satu kali. Untuk perubahan data hubungi admin/operator.', v_dup_reg;
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
-- 3) VERIFIKASI
-- ============================================================
select 'patch-biodata-ajukan' as bagian, 'OK' as status,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in ('peserta_get_biodata','app_submit_pengajuan')
         and p.prosecdef) as rpc_security_definer;
