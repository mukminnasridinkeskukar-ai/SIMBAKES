/**
 * ============================================================
 * SIMBAKES - PROFIL AKUN PESERTA (Fitur Baru)
 * ============================================================
 * Setiap akun peserta dapat:
 *   1. Melihat & MENYUNTING profilnya sendiri:
 *      - Foto profil (upload ke Supabase Storage bucket "profil-foto")
 *      - Nama lengkap, email, username
 *      - NIK hanya TAMPIL dalam bentuk disamarkan & TIDAK dapat diubah
 *        (perubahan NIK hanya lewat admin/operator)
 *   2. Mengganti PASSWORD aktifnya sendiri (verifikasi password lama di
 *      server, hash bcrypt di server — password tidak pernah dikirim
 *      dalam bentuk tersimpan, hanya lewat RPC sesi token).
 *
 * Data disimpan di tabel `akun_peserta` (kolom foto_url ditambahkan oleh
 * sql/PATCH-PROFIL-OBSERVER-PRIVASI.sql). Semua penulisan lewat RPC:
 *   - peserta_update_profile(p_token, p_record)
 *   - peserta_change_password(p_token, p_old, p_new)
 * yang memvalidasi token sesi peserta di server (hanya pemilik akun).
 *
 * File ini tidak mengubah modul lama — hanya menambah fitur.
 * ============================================================
 */

(function () {
    'use strict';

    const PROFIL_BUCKET = 'profil-foto';

    // ===== UTIL =====
    function escHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function getPesertaToken() {
        try { return (window.SecurityGuard && window.SecurityGuard.getPesertaToken()) || null; }
        catch (e) { return null; }
    }

    function getClient() {
        try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
        } catch (e) { /* belum siap */ }
        return null;
    }

    function isRpcMissing(err) {
        if (!err) return false;
        const msg = String(err.message || '') + ' ' + String(err.code || '');
        return err.code === 'PGRST202' ||
               msg.indexOf('Could not find the function') !== -1 ||
               (msg.indexOf('schema cache') !== -1 && msg.indexOf('peserta_') !== -1);
    }

    function toast(msg, type, dur) {
        if (typeof showToast === 'function') showToast(msg, type || 'info', dur || 3500);
    }

    /** Perbarui sesi peserta di memori + localStorage + UI topbar/avatar */
    function persistPesertaSession(patch) {
        try {
            if (typeof pesertaSessionData !== 'undefined' && pesertaSessionData) {
                Object.assign(pesertaSessionData, patch || {});
            } else {
                window.pesertaSessionData = Object.assign({}, patch || {});
            }
            const stored = JSON.parse(localStorage.getItem('simbakes_peserta_session') || '{}');
            Object.assign(stored, patch || {});
            stored.isLoggedIn = true;
            localStorage.setItem('simbakes_peserta_session', JSON.stringify(stored));
            if (typeof updateUIForLoggedInPeserta === 'function') {
                updateUIForLoggedInPeserta(pesertaSessionData);
            }
            if (typeof renderPesertaAvatar === 'function') {
                renderPesertaAvatar(document.getElementById('peserta-dash-avatar'), pesertaSessionData);
            }
        } catch (e) { /* abaikan */ }
    }

    // ============================================================
    // MODAL PROFIL
    // ============================================================

    function pastikanSesiPeserta() {
        if (typeof pesertaSessionData !== 'undefined' && pesertaSessionData && pesertaSessionData.id) {
            return pesertaSessionData;
        }
        // Pulihkan dari localStorage (divalidasi token oleh SecurityGuard)
        try {
            const raw = localStorage.getItem('simbakes_peserta_session');
            if (raw) {
                const s = JSON.parse(raw);
                if (s && s.id) { window.pesertaSessionData = s; return s; }
            }
        } catch (e) { /* abaikan */ }
        return null;
    }

    function openProfilPeserta() {
        const session = pastikanSesiPeserta();
        if (!session) {
            toast('🔐 Silakan login terlebih dahulu', 'error');
            if (typeof openPesertaLogin === 'function') openPesertaLogin();
            return;
        }

        // Tutup modal info peserta bila terbuka (agar tidak bertumpuk)
        if (typeof closePesertaInfoModal === 'function') {
            try { closePesertaInfoModal(); } catch (e) { /* abaikan */ }
        }

        let modal = document.getElementById('peserta-profil-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'peserta-profil-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
        <div class="modal-content" style="max-width:560px; max-height:92vh; overflow-y:auto; border-radius:20px; background:white;">
            <div style="background:linear-gradient(135deg,#059669,#047857); padding:1.5rem 2rem; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                <h2 style="color:white; font-size:1.25rem; font-weight:700; margin:0; flex:1; min-width:0;">👤 Profil & Keamanan Akun</h2>
                <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                    <button type="button" id="profil-kembali-portal" title="Kembali ke Portal Peserta"
                        style="display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.45); color:white; padding:8px 14px; border-radius:10px; font-size:0.85rem; font-weight:600; cursor:pointer; transition:background 0.2s, border-color 0.2s; white-space:nowrap;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
                        <span>Kembali<span id="profil-back-ext"> ke Portal</span></span>
                    </button>
                    <button type="button" id="profil-close-x" style="background:rgba(255,255,255,0.2); border:none; color:white; width:34px; height:34px; border-radius:50%; font-size:1.1rem; cursor:pointer; flex-shrink:0;">✕</button>
                </div>
            </div>
            <form id="profil-form" novalidate>
                <div style="padding:1.5rem 2rem;">
                    <!-- FOTO PROFIL -->
                    <div style="text-align:center; margin-bottom:1.5rem;">
                        <div id="profil-foto-wrap" style="width:110px; height:110px; margin:0 auto; border-radius:50%; background:#e2e8f0; background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; font-size:2.6rem; color:#94a3b8; box-shadow:0 4px 14px rgba(15,23,42,0.12); overflow:hidden;">
                            ${session.foto_url ? '' : '👤'}
                        </div>
                        <input type="file" id="profil-foto-input" accept="image/jpeg,image/png,image/webp" style="display:none;">
                        <div style="margin-top:10px; display:flex; gap:8px; justify-content:center;">
                            <button type="button" id="profil-foto-pilih" style="padding:8px 16px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:10px; font-size:0.85rem; font-weight:600; cursor:pointer;">📷 Pilih Foto</button>
                            <button type="button" id="profil-foto-hapus" style="padding:8px 16px; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; border-radius:10px; font-size:0.85rem; font-weight:600; cursor:pointer;">🗑️ Hapus Foto</button>
                        </div>
                        <small style="color:#94a3b8; display:block; margin-top:6px;">JPG/PNG/WebP, maks 2 MB. Foto tampil pada avatar akun Anda.</small>
                    </div>

                    <!-- DATA PROFIL -->
                    <div style="display:grid; gap:12px;">
                        <div>
                            <label style="font-size:0.8rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Nama Lengkap</label>
                            <input type="text" id="profil-nama" value="${escHtml(session.nama || '')}" maxlength="120" required
                                style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:0.95rem; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:0.8rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Username (untuk login)</label>
                            <input type="text" id="profil-username" value="${escHtml(session.username || '')}" maxlength="40" required
                                style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:0.95rem; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:0.8rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Email</label>
                            <input type="email" id="profil-email" value="${escHtml(session.email || '')}" maxlength="120"
                                style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:0.95rem; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:0.8rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">NIK (tidak dapat diubah)</label>
                            <input type="text" id="profil-nik" value="${escHtml(typeof maskNik === 'function' ? maskNik(session.nik) : '••••••••')}" disabled
                                style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:0.95rem; background:#f1f5f9; color:#64748b; box-sizing:border-box;">
                            <small style="color:#94a3b8;">Perubahan NIK hanya dapat dilakukan admin/operator.</small>
                        </div>
                    </div>

                    <!-- GANTI PASSWORD -->
                    <div style="margin-top:1.4rem; background:#f8fafc; border:1.5px dashed #cbd5e1; border-radius:14px; padding:1rem 1.2rem;">
                        <div style="font-weight:700; color:#334155; font-size:0.95rem; margin-bottom:2px;">🔑 Ganti Password (opsional)</div>
                        <small style="color:#94a3b8; display:block; margin-bottom:10px;">Kosongkan bila tidak ingin mengganti. Password baru minimal 8 karakter.</small>
                        <div style="display:grid; gap:10px;">
                            <input type="password" id="profil-pass-lama" placeholder="Password saat ini" autocomplete="current-password"
                                style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:0.95rem; box-sizing:border-box;">
                            <input type="password" id="profil-pass-baru" placeholder="Password baru (min. 8 karakter)" autocomplete="new-password"
                                style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:0.95rem; box-sizing:border-box;">
                            <input type="password" id="profil-pass-ulang" placeholder="Ulangi password baru" autocomplete="new-password"
                                style="width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:0.95rem; box-sizing:border-box;">
                        </div>
                    </div>

                    <div id="profil-alert" style="display:none; margin-top:1rem; padding:12px 14px; border-radius:10px; font-size:0.9rem;"></div>

                    <div style="display:flex; gap:10px; margin-top:1.4rem;">
                        <button type="button" id="profil-batal" style="flex:1; padding:12px; background:#f1f5f9; color:#475569; border:none; border-radius:10px; font-weight:600; cursor:pointer;">Batal</button>
                        <button type="submit" id="profil-simpan" style="flex:2; padding:12px; background:linear-gradient(135deg,#059669,#047857); color:white; border:none; border-radius:10px; font-weight:700; cursor:pointer;">💾 Simpan Perubahan</button>
                    </div>
                </div>
            </form>
        </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));
        document.body.style.overflow = 'hidden';
        modal.addEventListener('click', (e) => { if (e.target === modal) closeProfilPeserta(); });

        // --- State foto ---
        let fotoBaruFile = null;      // File baru yang dipilih
        let hapusFoto = false;        // tandai hapus foto lama
        const fotoWrap = modal.querySelector('#profil-foto-wrap');

        function tampilFotoPreview(url) {
            if (url) {
                fotoWrap.style.backgroundImage = `url('${url}')`;
                fotoWrap.textContent = '';
            } else {
                fotoWrap.style.backgroundImage = '';
                fotoWrap.textContent = '👤';
            }
        }
        tampilFotoPreview(session.foto_url || '');

        modal.querySelector('#profil-foto-pilih').addEventListener('click', () => {
            modal.querySelector('#profil-foto-input').click();
        });
        modal.querySelector('#profil-foto-input').addEventListener('change', function () {
            const f = this.files && this.files[0];
            if (!f) return;
            if (['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) === -1) {
                tampilAlert('❌ Format foto harus JPG, PNG, atau WebP.', 'error');
                this.value = ''; return;
            }
            if (f.size > 2 * 1024 * 1024) {
                tampilAlert('❌ Ukuran foto maksimal 2 MB.', 'error');
                this.value = ''; return;
            }
            fotoBaruFile = f; hapusFoto = false;
            const reader = new FileReader();
            reader.onload = (ev) => tampilFotoPreview(ev.target.result);
            reader.readAsDataURL(f);
            tampilAlert('', 'info', true);
        });
        modal.querySelector('#profil-foto-hapus').addEventListener('click', () => {
            fotoBaruFile = null; hapusFoto = true;
            modal.querySelector('#profil-foto-input').value = '';
            tampilFotoPreview('');
            toast('Foto akan dihapus saat Anda menyimpan.', 'info', 2500);
        });

        // --- Alert helper ---
        const alertEl = modal.querySelector('#profil-alert');
        function tampilAlert(msg, type, silent) {
            if (!msg) { alertEl.style.display = 'none'; alertEl.innerHTML = ''; return; }
            if (silent) { alertEl.style.display = 'none'; return; }
            const warna = type === 'error' ? '#fef2f2|#991b1b|#fecaca' :
                          type === 'success' ? '#f0fdf4|#166534|#bbf7d0' : '#eff6ff|#1e40af|#bfdbfe';
            const [bg, fg, bd] = warna.split('|');
            alertEl.style.display = 'block';
            alertEl.style.background = bg;
            alertEl.style.color = fg;
            alertEl.style.border = '1px solid ' + bd;
            alertEl.innerHTML = msg;
        }

        // --- Tutup / batal ---
        modal.querySelector('#profil-close-x').addEventListener('click', closeProfilPeserta);
        modal.querySelector('#profil-batal').addEventListener('click', closeProfilPeserta);

        // --- Tombol kembali ke Portal Peserta ---
        const kembaliBtn = modal.querySelector('#profil-kembali-portal');
        if (kembaliBtn) {
            kembaliBtn.addEventListener('click', closeProfilPeserta);
            kembaliBtn.addEventListener('mouseenter', function () {
                kembaliBtn.style.background = 'rgba(255,255,255,0.32)';
                kembaliBtn.style.borderColor = 'rgba(255,255,255,0.7)';
            });
            kembaliBtn.addEventListener('mouseleave', function () {
                kembaliBtn.style.background = 'rgba(255,255,255,0.15)';
                kembaliBtn.style.borderColor = 'rgba(255,255,255,0.45)';
            });
        }

        // --- Submit ---
        modal.querySelector('#profil-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            simpanProfil(modal, { fotoBaruFile, hapusFoto, tampilAlert, tampilFotoPreview });
        });

        console.log('[PROFIL PESERTA] Modal profil dibuka');
    }

    function closeProfilPeserta() {
        const modal = document.getElementById('peserta-profil-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 250);
        }
        document.body.style.overflow = '';
    }

    // ============================================================
    // SIMPAN PROFIL (RPC server-side)
    // ============================================================
    async function simpanProfil(modal, ctx) {
        const { fotoBaruFile, hapusFoto, tampilAlert } = ctx;
        const btn = modal.querySelector('#profil-simpan');
        const token = getPesertaToken();
        const session = pastikanSesiPeserta();

        if (!token || !session) {
            tampilAlert('❌ Sesi berakhir. Silakan logout lalu login kembali.', 'error');
            return;
        }

        // ---- Validasi input ----
        const nama = modal.querySelector('#profil-nama').value.trim();
        const username = modal.querySelector('#profil-username').value.trim().toLowerCase();
        const email = modal.querySelector('#profil-email').value.trim().toLowerCase();
        const passLama = modal.querySelector('#profil-pass-lama').value;
        const passBaru = modal.querySelector('#profil-pass-baru').value;
        const passUlang = modal.querySelector('#profil-pass-ulang').value;

        if (!nama || nama.length < 3) { tampilAlert('❌ Nama lengkap wajib diisi (min. 3 karakter).', 'error'); return; }
        if (!username || !/^[a-z0-9_.]{4,40}$/.test(username)) {
            tampilAlert('❌ Username 4–40 karakter, hanya huruf kecil, angka, titik, atau garis bawah.', 'error'); return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { tampilAlert('❌ Format email tidak valid.', 'error'); return; }

        const mauGantiPass = passBaru || passUlang || passLama;
        if (mauGantiPass) {
            if (!passLama) { tampilAlert('❌ Isi password saat ini untuk mengganti password.', 'error'); return; }
            if (passBaru.length < 8) { tampilAlert('❌ Password baru minimal 8 karakter.', 'error'); return; }
            if (passBaru !== passUlang) { tampilAlert('❌ Ulangi password tidak sama dengan password baru.', 'error'); return; }
            if (passBaru === passLama) { tampilAlert('❌ Password baru tidak boleh sama dengan password lama.', 'error'); return; }
        }

        btn.disabled = true;
        const labelLama = btn.innerHTML;
        btn.innerHTML = '<div class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite;vertical-align:middle;"></div> Menyimpan...';

        try {
            const client = getClient();
            if (!client) throw new Error('Koneksi database tidak tersedia. Periksa internet Anda.');

            // 1) Upload foto baru (bila dipilih)
            let fotoUrl = hapusFoto ? '' : (session.foto_url || '');
            if (fotoBaruFile) {
                const extMatch = String(fotoBaruFile.name || '').match(/\.([A-Za-z0-9]{2,5})$/);
                const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
                const path = 'profil/' + String(session.id).replace(/[^A-Za-z0-9_-]/g, '') +
                             '/foto-' + Date.now() + '-' + Math.floor(Math.random() * 9000 + 1000) + '.' + ext;
                // [Revisi 15 Okt] Driver Cloudflare R2 bila aktif (js/r2-config.js) —
                // database profil tetap disimpan via RPC Supabase seperti biasa.
                if (window.r2Enabled && window.r2Enabled()) {
                    fotoUrl = await window.r2UploadPublicUrl(fotoBaruFile, path);
                } else {
                    const up = await client.storage.from(PROFIL_BUCKET).upload(path, fotoBaruFile, {
                        contentType: fotoBaruFile.type || 'image/jpeg',
                        cacheControl: '3600',
                        upsert: true
                    });
                    if (up && up.error) {
                        const msgUp = up.error.message || '';
                        if (/Bucket not found/i.test(msgUp)) {
                            throw new Error('Penyimpanan foto belum disiapkan. Admin perlu menjalankan sekali sql/PATCH-PROFIL-OBSERVER-PRIVASI.sql di Supabase SQL Editor.');
                        }
                        throw new Error('Upload foto gagal: ' + msgUp);
                    }
                    const pub = client.storage.from(PROFIL_BUCKET).getPublicUrl(path);
                    fotoUrl = (pub && pub.data && pub.data.publicUrl) || '';
                    if (!fotoUrl) throw new Error('URL foto tidak diperoleh setelah upload.');
                }
            }

            // 2) Simpan profil via RPC (server memvalidasi pemilik akun)
            const res = await client.rpc('peserta_update_profile', {
                p_token: token,
                p_record: {
                    id: String(session.id),
                    nama: nama,
                    username: username,
                    email: email,
                    foto_url: fotoUrl
                }
            });
            if (res && res.error) {
                if (isRpcMissing(res.error)) {
                    throw new Error('Fitur profil belum aktif di server. Admin perlu menjalankan sql/PATCH-PROFIL-OBSERVER-PRIVASI.sql di Supabase SQL Editor.');
                }
                throw new Error(res.error.message || 'Gagal menyimpan profil.');
            }

            // 3) Ganti password (bila diminta) — verifikasi password lama di server
            if (mauGantiPass) {
                const resPw = await client.rpc('peserta_change_password', {
                    p_token: token,
                    p_old: passLama,
                    p_new: passBaru
                });
                if (resPw && resPw.error) {
                    const msg = resPw.error.message || '';
                    if (isRpcMissing(resPw.error)) {
                        throw new Error('Profil tersimpan, tetapi fitur ganti password belum aktif di server (jalankan patch SQL).');
                    }
                    throw new Error(msg.indexOf('Password saat ini salah') !== -1 ? '❌ Password saat ini salah.' : msg);
                }
            }

            // 4) Sukses -> perbarui sesi lokal + UI
            persistPesertaSession({ nama, username, email, foto_url: fotoUrl });
            toast('✅ Profil berhasil diperbarui' + (mauGantiPass ? ' & password diganti' : '') + '!', 'success', 4500);
            closeProfilPeserta();

        } catch (err) {
            console.error('[PROFIL PESERTA] Gagal simpan:', err);
            tampilAlert('❌ ' + (err && err.message ? err.message : 'Terjadi kesalahan. Coba lagi.'), 'error');
            btn.disabled = false;
            btn.innerHTML = labelLama;
            return;
        }
        btn.disabled = false;
        btn.innerHTML = labelLama;
    }

    // ============================================================
    // EXPORT GLOBAL
    // ============================================================
    window.openProfilPeserta = openProfilPeserta;
    window.closeProfilPeserta = closeProfilPeserta;

    console.log('[PROFIL PESERTA] 📦 Modul Profil & Keamanan Akun Peserta siap');
})();
