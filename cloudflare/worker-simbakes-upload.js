/**
 * ============================================================
 * SIMBAKES UPLOAD WORKER — Cloudflare Workers [Revisi 15 Okt b]
 * Mendukung 2 BACKEND PENYIMPANAN (pilih lewat variable STORAGE_BACKEND):
 *
 *   1) STORAGE_BACKEND = "r2"  → Cloudflare R2 (butuh kartu utk aktivasi)
 *   2) STORAGE_BACKEND = "b2"  → Backblaze B2 ★ TANPA KARTU KREDIT ★
 *        - 10 GB gratis, egress gratis s.d. 3x kapasitas/bulan
 *        - variabel: B2_KEY_ID, B2_APP_KEY, B2_BUCKET_ID, B2_BUCKET_NAME
 *
 * ENDPOINT (sama untuk kedua backend):
 *   GET  /health            → tes hidup (publik)
 *   POST /upload            → upload 1 file   (butuh token)
 *   POST /delete            → hapus 1 file    (butuh token)
 *   GET  /list?prefix=...   → daftar file     (butuh token)
 *
 * PANDUAN: README-CLOUDFLARE-R2.md (R2) atau README-BACKBLAZE-B2.md (B2).
 * Browser aplikasi TIDAK perlu diubah — kontrak js/r2-config.js tetap sama.
 * ============================================================
 */

const ALLOWED_PREFIXES = ['pengajuan/', 'rekomendasi/', 'profil/'];
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB — sama dengan validasi form SIMBAKES

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

function checkAuth(request, env) {
  const h = request.headers.get('Authorization') || '';
  return !!env.UPLOAD_TOKEN && h === 'Bearer ' + env.UPLOAD_TOKEN;
}

/** Rapikan path & tolak yang berbahaya. null = tolak. */
function sanitizePath(p) {
  p = String(p || '').trim().replace(/^\/+/, '');
  if (!p || p.includes('..')) return null;
  p = p.replace(/[^A-Za-z0-9._\/-]/g, '_');
  if (p.split('/').length > 6 || p.length > 220) return null;
  return p;
}

/** Path harus berada di folder yang diizinkan (defense-in-depth). */
function prefixAllowed(path) {
  return ALLOWED_PREFIXES.some((pre) => path.startsWith(pre));
}

function extAllowed(name) {
  const m = String(name || '').match(/\.([A-Za-z0-9]{2,5})$/);
  return !!m && ALLOWED_EXT.includes(m[1].toLowerCase());
}

function encodeKeyPath(key) {
  return key.split('/').map(encodeURIComponent).join('/');
}

async function sha1Hex(buf) {
  const d = await crypto.subtle.digest('SHA-1', buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ============================================================
 * BACKEND B2 (Backblaze) — native API, tanpa SDK
 * ============================================================ */
const b2Cache = { auth: null, upload: null }; // cache per-isolate (token B2 berlaku 24 jam)

async function b2Authorize(env) {
  const now = Date.now();
  if (b2Cache.auth && b2Cache.auth.exp > now) return b2Cache.auth;
  const basic = btoa((env.B2_KEY_ID || '') + ':' + (env.B2_APP_KEY || ''));
  const resp = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: 'Basic ' + basic },
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || !body.authToken) {
    throw new Error('B2 authorize gagal (HTTP ' + resp.status + '): ' + (body.message || 'cek B2_KEY_ID/B2_APP_KEY'));
  }
  // segarkan 1 jam lebih awal dari umur token (24 jam)
  b2Cache.auth = { ...body, exp: now + 23 * 3600 * 1000 };
  return b2Cache.auth;
}

async function b2UploadToken(env) {
  const now = Date.now();
  if (b2Cache.upload && b2Cache.upload.exp > now) return b2Cache.upload;
  const auth = await b2Authorize(env);
  const resp = await fetch(auth.apiUrl + '/b2api/v3/b2_get_upload_url', {
    method: 'POST',
    headers: { Authorization: auth.authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: env.B2_BUCKET_ID }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || !body.uploadUrl) {
    throw new Error('B2 get_upload_url gagal (HTTP ' + resp.status + '): ' + (body.message || 'cek B2_BUCKET_ID'));
  }
  b2Cache.upload = { ...body, exp: now + 23 * 3600 * 1000 };
  return b2Cache.upload;
}

async function b2UploadFile(env, path, buf, mime) {
  const up = await b2UploadToken(env);
  const sha1 = await sha1Hex(buf);
  const resp = await fetch(up.uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: up.authorizationToken,
      'X-Bz-File-Name': encodeURIComponent(path),
      'Content-Type': mime,
      'X-Bz-Content-Sha1': sha1,
    },
    body: buf,
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    if (body.code === 'duplicate_file_name') {
      const err = new Error('File dengan nama sama sudah ada (409).');
      err.httpStatus = 409;
      throw err;
    }
    // token upload bisa kedaluwarsa lebih cepat saat isolate lama — reset & sekali ulang
    if (/expired_auth_token|bad_auth_token/i.test(body.code || '')) {
      b2Cache.upload = null; b2Cache.auth = null;
      const up2 = await b2UploadToken(env);
      const r2 = await fetch(up2.uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: up2.authorizationToken,
          'X-Bz-File-Name': encodeURIComponent(path),
          'Content-Type': mime,
          'X-Bz-Content-Sha1': sha1,
        },
        body: buf,
      });
      const b2 = await r2.json().catch(() => ({}));
      if (!r2.ok) {
        const e = new Error('B2 upload gagal (HTTP ' + r2.status + '): ' + (b2.message || ''));
        e.httpStatus = 502; throw e;
      }
      return b2;
    }
    const e = new Error('B2 upload gagal (HTTP ' + resp.status + '): ' + (body.message || ''));
    e.httpStatus = 502;
    throw e;
  }
  return body;
}

async function b2DeleteFile(env, path) {
  const auth = await b2Authorize(env);
  const list = await fetch(auth.apiUrl + '/b2api/v3/b2_list_file_names', {
    method: 'POST',
    headers: { Authorization: auth.authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: env.B2_BUCKET_ID, prefix: path, maxFileCount: 10 }),
  });
  const lj = await list.json().catch(() => ({}));
  if (!list.ok) throw new Error('B2 list gagal (HTTP ' + list.status + '): ' + (lj.message || ''));
  const hit = (lj.files || []).find((f) => f.fileName === path);
  if (!hit) return { deleted: false };
  const del = await fetch(auth.apiUrl + '/b2api/v3/b2_delete_file_version', {
    method: 'POST',
    headers: { Authorization: auth.authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId: hit.fileId, fileName: hit.fileName }),
  });
  const dj = await del.json().catch(() => ({}));
  if (!del.ok) throw new Error('B2 delete gagal (HTTP ' + del.status + '): ' + (dj.message || ''));
  return { deleted: true };
}

async function b2ListFiles(env, prefix, startFileName) {
  const auth = await b2Authorize(env);
  const bodyReq = { bucketId: env.B2_BUCKET_ID, prefix: prefix || '', maxFileCount: 100 };
  if (startFileName) bodyReq.startFileName = startFileName;
  const list = await fetch(auth.apiUrl + '/b2api/v3/b2_list_file_names', {
    method: 'POST',
    headers: { Authorization: auth.authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyReq),
  });
  const lj = await list.json().catch(() => ({}));
  if (!list.ok) throw new Error('B2 list gagal (HTTP ' + list.status + '): ' + (lj.message || ''));
  return {
    objects: (lj.files || []).map((f) => ({
      key: f.fileName,
      size: f.contentLength || 0,
      uploaded: f.uploadTimestamp ? new Date(f.uploadTimestamp).toISOString() : null,
    })),
    truncated: !!lj.nextFileName,
    cursor: lj.nextFileName || null,
  };
}

function b2PublicUrl(env, path) {
  // downloadUrl diambil dari respons b2_authorize_account (f001/f002/dll.),
  // bukan di-hardcode — contoh: https://f001.backblazeb2.com/file/<bucket>/<key>
  const dl = ((b2Cache.auth && b2Cache.auth.downloadUrl) || 'https://f000.backblazeb2.com').replace(/\/+$/, '');
  return dl + '/file/' + env.B2_BUCKET_NAME + '/' + encodeKeyPath(path);
}

/* ============================================================
 * ROUTER UTAMA
 * ============================================================ */
export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const route = url.pathname.replace(/\/+$/, '');
    const backend = (env.STORAGE_BACKEND || 'r2').toLowerCase();

    try {
      // ---- Pemeriksaan konfigurasi dasar ----
      if (backend === 'r2' && !env.BUCKET) {
        return json({ ok: false, error: 'Binding R2 "BUCKET" belum diisi (atau set STORAGE_BACKEND=b2 untuk Backblaze tanpa kartu).' }, 500);
      }
      if (backend === 'b2' && (!env.B2_KEY_ID || !env.B2_APP_KEY || !env.B2_BUCKET_ID || !env.B2_BUCKET_NAME)) {
        return json({ ok: false, error: 'STORAGE_BACKEND=b2 tetapi B2_KEY_ID / B2_APP_KEY / B2_BUCKET_ID / B2_BUCKET_NAME belum lengkap.' }, 500);
      }

      // ---- GET /health (publik, untuk tes cepat) ----
      if (route === '/health' && request.method === 'GET') {
        return json({ ok: true, service: 'simbakes-upload', backend });
      }

      // ---- Semua endpoint lain wajib token ----
      if (!checkAuth(request, env)) {
        return json({ ok: false, error: 'Token tidak cocok. Samakan "token" di js/r2-config.js dengan secret UPLOAD_TOKEN di Worker.' }, 401);
      }

      // ---- POST /upload ----
      if (route === '/upload' && request.method === 'POST') {
        const form = await request.formData();
        const file = form.get('file');
        const rawPath = form.get('path');
        if (!(file instanceof File)) return json({ ok: false, error: 'Field "file" wajib ada.' }, 400);
        const path = sanitizePath(rawPath);
        if (!path) return json({ ok: false, error: 'Path tidak valid.' }, 400);
        if (!prefixAllowed(path)) {
          return json({ ok: false, error: 'Path harus diawali salah satu dari: ' + ALLOWED_PREFIXES.join(' / ') }, 400);
        }
        if (!extAllowed(file.name)) return json({ ok: false, error: 'Tipe file tidak didukung (hanya PDF, JPG, PNG, WEBP).' }, 400);
        if (file.size > MAX_SIZE) return json({ ok: false, error: 'Ukuran file melebihi 10 MB.' }, 413);
        if (file.size === 0) return json({ ok: false, error: 'File kosong (0 byte).' }, 400);

        const mime = ALLOWED_MIME.includes(file.type) ? file.type : 'application/octet-stream';
        const buf = await file.arrayBuffer();

        if (backend === 'b2') {
          // B2 menolak timpa (duplicate) — nama dari SIMBAKES selalu unik
          await b2UploadFile(env, path, buf, mime);
          return json({ ok: true, key: path, url: b2PublicUrl(env, path) });
        }

        // R2: tolak timpa file yang sudah ada (head check)
        const existing = await env.BUCKET.head(path);
        if (existing) return json({ ok: false, error: 'File dengan nama sama sudah ada (409).' }, 409);
        await env.BUCKET.put(path, buf, {
          httpMetadata: { contentType: mime, cacheControl: '3600' },
        });
        const base = (env.R2_PUBLIC_BASE || '').replace(/\/+$/, '');
        return json({ ok: true, key: path, url: base ? base + '/' + path : null });
      }

      // ---- POST /delete ----
      if (route === '/delete' && request.method === 'POST') {
        let body = {};
        try { body = await request.json(); } catch (e) { /* abaikan */ }
        let path = sanitizePath(body.path || body.key);
        if (!path && body.url) {
          const marker = backend === 'b2'
            ? '/file/' + env.B2_BUCKET_NAME + '/'
            : (env.R2_PUBLIC_BASE || '').replace(/\/+$/, '') + '/';
          const idx = String(body.url).indexOf(marker);
          if (idx !== -1) path = sanitizePath(String(body.url).substring(idx + marker.length).split('?')[0]);
        }
        if (!path) return json({ ok: false, error: 'Path/URL tidak valid.' }, 400);
        if (!prefixAllowed(path)) return json({ ok: false, error: 'Path di luar folder yang diizinkan.' }, 400);

        if (backend === 'b2') {
          const r = await b2DeleteFile(env, path);
          return json({ ok: true, deleted: r.deleted });
        }
        await env.BUCKET.delete(path);
        return json({ ok: true, deleted: true });
      }

      // ---- GET /list?prefix=...&cursor=... ----
      if (route === '/list' && request.method === 'GET') {
        let prefix = sanitizePath(url.searchParams.get('prefix') || '');
        if (prefix && !prefixAllowed(prefix)) {
          return json({ ok: false, error: 'Prefix di luar folder yang diizinkan.' }, 400);
        }
        const cursor = url.searchParams.get('cursor') || undefined;
        let result;
        if (backend === 'b2') {
          result = await b2ListFiles(env, prefix, cursor);
        } else {
          const listing = await env.BUCKET.list({ prefix, cursor, limit: 100 });
          result = {
            objects: (listing.objects || []).map((o) => ({ key: o.key, size: o.size, uploaded: o.uploaded })),
            truncated: !!listing.truncated,
            cursor: listing.truncated ? listing.cursor : null,
          };
        }
        return json({ ok: true, ...result });
      }

      return json({ ok: false, error: 'Endpoint tidak dikenal.' }, 404);
    } catch (err) {
      console.error('[SIMBAKES-WORKER]', err);
      return json({ ok: false, error: String((err && err.message) || err) }, err.httpStatus || 500);
    }
  },
};
