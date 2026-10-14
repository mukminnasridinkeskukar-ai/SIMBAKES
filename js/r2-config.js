/* ============================================================
 * R2-CONFIG (SIMBAKES) — [Revisi 15 Okt b]
 * DRIVER PENYIMPANAN FILE EKSTERNAL (opsional, tanpa ubah database)
 *
 * Mendukung 2 backend lewat Worker yang sama (lihat folder cloudflare/):
 *   • Cloudflare R2   → README-CLOUDFLARE-R2.md  (butuh kartu utk aktivasi)
 *   • Backblaze B2 ★  → README-BACKBLAZE-B2.md   (TANPA kartu kredit)
 *
 * ARSITEKTUR:
 *   • Database (tabel submissions, akun_peserta, RPC, sesi login)
 *     TETAP di Supabase — tidak ada yang berubah.
 *   • File dokumen/foto BARU diupload langsung dari browser ke Worker
 *     kecil yang menyimpannya ke R2/B2 dan mengembalikan URL publik.
 *   • URL file yang tersimpan di database berupa URL publik absolut;
 *     semua penampil foto di aplikasi sudah menampilkannya apa adanya,
 *     sehingga data LAMA (Supabase) tetap tampil normal.
 *
 * CARA MENGAKTIFKAN (setelah Worker & bucket siap):
 *   1. enabled  : false → true
 *   2. uploadUrl: URL Worker Anda (contoh 'https://simbakes-upload.abcd.workers.dev')
 *   3. publicBase: URL publik baca file:
 *        R2 : 'https://pub-xxxx.r2.dev'
 *        B2 : 'https://fNNN.backblazeb2.com/file/<nama-bucket>'
 *      — TANPA garis miring di akhir.
 *   4. token    : sama persis dengan secret UPLOAD_TOKEN di Worker.
 *
 * ROLLBACK INSTAN: enabled: false → aplikasi kembali 100% ke
 * Supabase Storage tanpa perlu deploy apa pun.
 * ============================================================ */
(function () {
    'use strict';

    var R2_CONFIG = {
        enabled: false,      // ← ganti jadi true setelah Worker R2 siap
        uploadUrl: '',       // ← URL Worker (tanpa trailing slash)
        publicBase: '',      // ← URL publik baca file (tanpa trailing slash)
        token: ''            // ← sama dengan secret UPLOAD_TOKEN di Worker
    };
    window.R2_CONFIG = R2_CONFIG;

    /** Apakah driver R2 aktif & konfigurasi lengkap? */
    window.r2Enabled = function () {
        return !!(R2_CONFIG.enabled && R2_CONFIG.uploadUrl &&
                  R2_CONFIG.publicBase && R2_CONFIG.token);
    };

    var MAX_SIZE = 10 * 1024 * 1024; // 10 MB — sama dengan validasi form
    var ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

    /**
     * Rapikan & amankan path: cabut '/' awal, blokir '..', charset aman.
     * @returns path bersih atau null bila berbahaya.
     */
    window.r2SanitizePath = function (path) {
        var p = String(path || '').trim().replace(/^\/+/, '');
        if (!p || p.indexOf('..') !== -1) return null;
        p = p.replace(/[^A-Za-z0-9._\/-]/g, '_');
        // maksimal kedalaman wajar agar tak menyalahgunakan struktur folder
        if (p.split('/').length > 6 || p.length > 220) return null;
        return p;
    };

    /**
     * Ekstrak path objek dari URL publik R2.
     * @returns path (string) atau '' bila bukan URL publikBase ini.
     */
    window.r2ExtractPath = function (url) {
        try {
            var s = String(url || '');
            var marker = R2_CONFIG.publicBase.replace(/\/+$/, '') + '/';
            if (!R2_CONFIG.publicBase) return '';
            var idx = s.indexOf(marker);
            if (idx !== 0) return '';
            return decodeURIComponent(s.substring(marker.length).split('?')[0]);
        } catch (e) { return ''; }
    };

    /** Validasi dasar file (mirror validasi form). @returns pesan error atau null */
    function validateFileBasic(file, storagePath) {
        if (!file) return 'File tidak ditemukan untuk diupload.';
        if (!window.r2SanitizePath(storagePath)) return 'Path penyimpanan tidak valid: ' + storagePath;
        if (file.size > MAX_SIZE) {
            return 'Ukuran "' + file.name + '" melebihi 10 MB — file terlalu besar.';
        }
        var m = String(file.name || '').match(/\.([A-Za-z0-9]{2,5})$/);
        var ext = m ? m[1].toLowerCase() : '';
        if (ALLOWED_EXT.indexOf(ext) === -1) {
            return 'Tipe file "' + file.name + '" tidak didukung (hanya PDF, JPG, PNG, WEBP).';
        }
        return null;
    }

    /**
     * Upload 1 file ke R2 via Worker → kembalikan URL publik absolut.
     * Error APAPUN dilempar (throw) — TIDAK ada sukses palsu
     * (disiplin yang sama dengan uploadFileToStorage Supabase).
     */
    window.r2UploadPublicUrl = async function (file, storagePath) {
        var err = validateFileBasic(file, storagePath);
        if (err) throw new Error(err);
        var safePath = window.r2SanitizePath(storagePath);
        var fd = new FormData();
        fd.append('path', safePath);
        fd.append('file', file, file.name);
        var resp;
        try {
            resp = await fetch(R2_CONFIG.uploadUrl.replace(/\/+$/, '') + '/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + R2_CONFIG.token },
                body: fd
            });
        } catch (netErr) {
            throw new Error('Tidak dapat menghubungi layanan upload Cloudflare (R2). ' +
                'Periksa koneksi internet / URL Worker di js/r2-config.js. (' + (netErr && netErr.message || netErr) + ')');
        }
        var body = null;
        try { body = await resp.json(); } catch (e) { /* respons non-JSON */ }
        if (!resp.ok || !body || !body.ok) {
            var msg = (body && body.error) || ('HTTP ' + resp.status);
            console.error('[R2] ❌ Upload gagal (' + safePath + '):', msg);
            if (resp.status === 401 || resp.status === 403) {
                throw new Error('Server R2 menolak upload: token tidak cocok. ' +
                    'Pastikan "token" di js/r2-config.js SAMA dengan secret UPLOAD_TOKEN di Worker Cloudflare.');
            }
            if (resp.status === 413 || /too large|besar/i.test(msg)) {
                throw new Error('Ukuran "' + file.name + '" melebihi batas 10 MB.');
            }
            if (resp.status === 409) {
                throw new Error('File dengan nama sama sudah ada di penyimpanan (409). Coba kirim lagi — nama baru akan dibuat otomatis.');
            }
            throw new Error('Upload "' + file.name + '" ke Cloudflare R2 gagal: ' + msg);
        }
        var publicUrl = (body && body.url) ||
            (R2_CONFIG.publicBase.replace(/\/+$/, '') + '/' + safePath);
        console.log('[R2] ✅ Terupload:', safePath, '→', publicUrl);
        return publicUrl;
    };

    /**
     * Hapus file R2 berdasarkan path atau URL publik.
     * @returns true bila server menjawab ok.
     */
    window.r2DeleteByPath = async function (pathOrUrl) {
        var path = String(pathOrUrl || '');
        if (/^https?:\/\//i.test(path)) path = window.r2ExtractPath(path);
        var safePath = window.r2SanitizePath(path);
        if (!safePath) return false;
        var resp = await fetch(R2_CONFIG.uploadUrl.replace(/\/+$/, '') + '/delete', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + R2_CONFIG.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: safePath })
        });
        var body = null;
        try { body = await resp.json(); } catch (e) { /* abaikan */ }
        return !!(resp.ok && body && body.ok);
    };

    console.log('[R2] r2-config dimuat — driver Cloudflare R2 ' +
        (window.r2Enabled() ? 'AKTIF' : 'nonaktif (mode Supabase Storage)'));
})();
