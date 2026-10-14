#!/usr/bin/env node
/**
 * ============================================================
 * MIGRASI FILE LAMA: Supabase Storage → Cloudflare R2 [Revisi 15 Okt]
 * ============================================================
 * OPSIONAL — file lama tetap tampil normal tanpa skrip ini.
 * Skrip ini menyalin SEMUA file dari bucket Supabase ke bucket R2
 * (lewat Worker simbakes-upload), lalu mencetak SQL untuk mengganti
 * URL di database. File asli TIDAK dihapus (hapus manual setelah yakin).
 *
 * SYARAT: Node.js 18+ (memakai fetch bawaan). Jalankan di komputer Anda:
 *
 *   1) Set variabel lingkungan (contoh Linux/macOS):
 *        export SUPABASE_URL="https://boeknpvlfamjmddsdopd.supabase.co"
 *        export SUPABASE_SERVICE_KEY="eyJ..."        # service_role (Dashboard → Settings → API)
 *        export R2_UPLOAD_URL="https://simbakes-upload.<akun>.workers.dev"
 *        export R2_TOKEN="<token sama dengan UPLOAD_TOKEN Worker>"
 *        export R2_PUBLIC_BASE="https://pub-xxxxxxxx.r2.dev"
 *        export DRY_RUN=1        # 1 = hanya daftar (tidak mengupload); 0 = migrasi beneran
 *
 *   2) node migrate-supabase-to-r2.mjs
 *
 * Hasil:
 *   - Daftar file per bucket + ukuran (mode DRY_RUN).
 *   - Mode penuh: menyalin file (aman diulang — file yang sudah ada di-
 *     lewati lewat respon 409 Worker), lalu mencetak SQL pengganti URL
 *     untuk tabel submissions & akun_peserta (review dulu, jalankan manual
 *     di Supabase SQL Editor).
 * ============================================================
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const R2_UPLOAD_URL = (process.env.R2_UPLOAD_URL || '').replace(/\/+$/, '');
const R2_TOKEN = process.env.R2_TOKEN || '';
const R2_PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || '').replace(/\/+$/, '');
const DRY_RUN = String(process.env.DRY_RUN || '1') !== '0';

const BUCKETS = ['pengajuan-files', 'profil-foto'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ SUPABASE_URL dan SUPABASE_SERVICE_KEY wajib diisi. Lihat panduan di kepala file.');
  process.exit(1);
}
if (!DRY_RUN && (!R2_UPLOAD_URL || !R2_TOKEN || !R2_PUBLIC_BASE)) {
  console.error('❌ Mode migrasi penuh butuh R2_UPLOAD_URL, R2_TOKEN, R2_PUBLIC_BASE.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ambil SEMUA objek satu bucket (paginasi). */
async function listAll(bucket) {
  const all = [];
  let offset = 0;
  const limit = 500;
  while (true) {
    const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix: '', limit, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!resp.ok) {
      throw new Error(`List ${bucket} gagal: HTTP ${resp.status} ${await resp.text()}`);
    }
    const items = await resp.json();
    if (!Array.isArray(items) || items.length === 0) break;
    for (const it of items) {
      if (it && it.name && !it.id === false) { /* folder pseudo punya id null */ }
      if (it && it.name) all.push(it);
    }
    if (items.length < limit) break;
    offset += limit;
  }
  return all.filter((o) => o.id); // hanya file sungguhan (id != null)
}

/** Unduh file dari URL publik (pakai service key agar tak tergantung policy). */
async function download(bucket, key) {
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/${bucket}/${encodeURI(key)}`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!resp.ok) throw new Error(`Unduh ${key} gagal: HTTP ${resp.status}`);
  return await resp.arrayBuffer();
}

/** Upload ke R2 via Worker. 409 = sudah ada → dianggap sukses (idempoten). */
async function uploadToR2(key, buf, contentType) {
  const fd = new FormData();
  fd.append('path', key);
  fd.append('file', new Blob([buf], { type: contentType }), key.split('/').pop());
  const resp = await fetch(`${R2_UPLOAD_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${R2_TOKEN}` },
    body: fd,
  });
  const body = await resp.json().catch(() => ({}));
  if (resp.status === 409) return { skipped: true };
  if (!resp.ok || !body.ok) throw new Error(`Upload ${key} gagal: HTTP ${resp.status} ${body.error || ''}`);
  return { skipped: false, url: body.url };
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (daftar saja)' : 'MIGRASI PENUH'}\n`);
  const allKeys = [];
  for (const bucket of BUCKETS) {
    const objs = await listAll(bucket);
    const totalMB = objs.reduce((s, o) => s + (o.metadata?.size || 0), 0) / 1024 / 1024;
    console.log(`📦 ${bucket}: ${objs.length} file (${totalMB.toFixed(1)} MB)`);
    for (const o of objs) allKeys.push({ bucket, key: o.key, size: o.metadata?.size || 0 });
  }
  if (DRY_RUN) {
    console.log('\nContoh 10 file:', JSON.stringify(allKeys.slice(0, 10), null, 2));
    console.log('\n✅ DRY RUN selesai. Untuk migrasi beneran: set DRY_RUN=0 lalu jalankan lagi.');
    return;
  }

  let ok = 0, skip = 0, fail = 0;
  for (const { bucket, key, size } of allKeys) {
    // path di R2 = sama dengan path di Supabase (folder sudah sesuai: pengajuan/, rekomendasi/, profil/)
    const destPath = `${bucket === 'profil-foto' ? 'profil' : bucket}/${key}`.replace(/^profil-foto\//, 'profil/');
    try {
      const buf = await download(bucket, key);
      const ct = bucket === 'pengajuan-files' ? 'application/pdf' : 'image/jpeg';
      const r = await uploadToR2(destPath, buf, ct);
      if (r.skipped) { skip++; console.log(`⏭  sudah ada: ${destPath}`); }
      else { ok++; console.log(`✅ ${destPath} (${(size / 1024).toFixed(0)} KB)`); }
      await sleep(50); // sopan terhadap API
    } catch (e) {
      fail++; console.error(`❌ ${bucket}/${key}:`, e.message);
    }
  }
  console.log(`\nSelesai: ${ok} terupload, ${skip} dilewati (sudah ada), ${fail} gagal.`);

  const supaBase1 = `${SUPABASE_URL}/storage/v1/object/public/pengajuan-files/`;
  const supaBase2 = `${SUPABASE_URL}/storage/v1/object/public/profil-foto/`;
  const r2Base = `${R2_PUBLIC_BASE}/`;
  console.log('\n===== SQL PENGANTI URL (review dulu, lalu jalankan di Supabase SQL Editor) =====\n');
  console.log(`-- 1) Tabel submissions (foto_peserta, dokumen_kelengkapan, rekomendasi_dinkes)`);
  console.log(`update public.submissions set foto_peserta = replace(foto_peserta, '${supaBase1}', '${r2Base}') where foto_peserta like '${supaBase1}%';`);
  console.log(`update public.submissions set dokumen_kelengkapan = replace(dokumen_kelengkapan, '${supaBase1}', '${r2Base}') where dokumen_kelengkapan like '%${supaBase1}%';`);
  console.log(`update public.submissions set rekomendasi_dinkes = replace(rekomendasi_dinkes, '${supaBase1}', '${r2Base}') where rekomendasi_dinkes like '%${supaBase1}%';`);
  console.log(`\n-- 2) Tabel akun_peserta (foto_url)`);
  console.log(`update public.akun_peserta set foto_url = replace(foto_url, '${supaBase2}', '${r2Base}') where foto_url like '${supaBase2}%';`);
  console.log(`\n⚠️  SETELAH SQL dijalankan dan SEMUA tampil normal, barulah hapus file lama`);
  console.log(`   di Dashboard Supabase → Storage (bucket pengajuan-files & profil-foto).`);
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
