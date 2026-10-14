/**
 * ============================================================
 * SIMBAKES - BIODATA PESERTA (VIEW-ONLY) [Revisi 15 Okt g]
 * ============================================================
 * Kartu "Biodata" di Portal Peserta:
 *   - Menampilkan SELURUH data pribadi peserta — sama dengan data
 *     yang ada di menu Data Pengajuan (tabel submissions):
 *     identitas, pekerjaan, rencana studi, kontak, dokumen, status.
 *   - Semuanya HANYA BISA DILIHAT (view) — tidak ada input/edit.
 *   - Sumber data: RPC peserta_get_biodata(p_token) — sesi
 *     divalidasi di server; peserta hanya dapat melihat biodatanya
 *     sendiri. Fallback: langsung dari submissions bila RPC belum
 *     terpasang (admin perlu menjalankan sql/PATCH-BIODATA-AJUKAN-SEKALI.sql).
 *
 * File ini tidak mengubah modul lama — hanya menambah fitur.
 * ============================================================
 */

(function () {
    'use strict';

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

    function pastikanSesiPeserta() {
        if (typeof pesertaSessionData !== 'undefined' && pesertaSessionData && pesertaSessionData.id) {
            return pesertaSessionData;
        }
        try {
            const raw = localStorage.getItem('simbakes_peserta_session');
            if (raw) {
                const s = JSON.parse(raw);
                if (s && s.id) { window.pesertaSessionData = s; return s; }
            }
        } catch (e) { /* abaikan */ }
        return null;
    }

    /** 2026-10-15 / ISO → "15 Okt 2026" (aman bila format tak dikenali) */
    function fmtTanggal(value) {
        const s = String(value == null ? '' : value).trim();
        if (!s) return '';
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            try {
                return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            } catch (e) { /* jatuh ke pola manual */ }
        }
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return m[3] + '/' + m[2] + '/' + m[1];
        return s;
    }

    /** Warna badge status pengajuan */
    function statusBadge(status) {
        const s = String(status || '').toLowerCase();
        let bg = '#eff6ff', fg = '#1d4ed8', bd = '#bfdbfe';
        if (s.indexOf('verifikasi') !== -1 && s.indexOf('proses') !== -1) { bg = '#fef9c3'; fg = '#a16207'; bd = '#fde68a'; }
        else if (s.indexOf('revisi') !== -1) { bg = '#ffedd5'; fg = '#c2410c'; bd = '#fed7aa'; }
        else if (s.indexOf('tolak') !== -1 || s.indexOf('gagal') !== -1) { bg = '#fef2f2'; fg = '#b91c1c'; bd = '#fecaca'; }
        else if (s.indexOf('lulus') !== -1 || s.indexOf('terima') !== -1 || s.indexOf('diluluskan') !== -1 || s.indexOf('penerima') !== -1) { bg = '#f0fdf4'; fg = '#15803d'; bd = '#bbf7d0'; }
        return '<span style="display:inline-flex;align-items:center;gap:6px;background:' + bg + ';color:' + fg +
            ';border:1px solid ' + bd + ';padding:5px 12px;border-radius:999px;font-size:0.75rem;font-weight:700;white-space:nowrap;">' +
            '<span style="width:7px;height:7px;border-radius:50%;background:currentColor;display:inline-block;"></span>' +
            escHtml(status || 'Proses Verifikasi') + '</span>';
    }

    function fieldBlock(label, value, opts) {
        const v = String(value == null ? '' : value).trim();
        const isi = v ? escHtml(v) : '<span style="color:#94a3b8;font-weight:600;">—</span>';
        return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;min-width:0;' +
            ((opts && opts.full) ? 'grid-column:1/-1;' : '') + '">' +
            '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;margin-bottom:4px;">' +
            escHtml(label) + '</div>' +
            '<div style="font-size:0.95rem;font-weight:600;color:#0f172a;line-height:1.5;overflow-wrap:anywhere;' +
            ((opts && opts.mono) ? 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.04em;' : '') +
            ((opts && opts.plain) ? 'font-weight:500;color:#334155;' : '') + '">' + isi + '</div></div>';
    }

    function sectionCard(icon, warna, judul, isiHtml) {
        return '<div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:1.1rem 1.2rem 1.2rem;box-shadow:0 2px 10px rgba(15,23,42,0.05);">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:0.9rem;">' +
            '<div style="width:34px;height:34px;border-radius:10px;background:' + warna + ';display:flex;align-items:center;justify-content:center;font-size:1rem;">' + icon + '</div>' +
            '<div style="font-weight:700;color:#0f172a;font-size:0.98rem;">' + escHtml(judul) + '</div></div>' +
            isiHtml + '</div>';
    }

    function docButton(url, label) {
        if (!url) return '';
        return '<a href="' + escHtml(url) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:7px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:9px 14px;border-radius:10px;font-size:0.85rem;font-weight:600;text-decoration:none;">🔗 ' + escHtml(label) + '</a>';
    }

    // ============================================================
    // POPUP BIODATA
    // ============================================================

    function pastikanPopup() {
        let popup = document.getElementById('peserta-biodata-popup');
        if (popup) popup.remove();
        popup = document.createElement('div');
        popup.id = 'peserta-biodata-popup';
        popup.className = 'peserta-content-popup';
        popup.innerHTML =
            '<div class="peserta-popup-topbar">' +
                '<div class="peserta-popup-title">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" width="22" height="22"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h4M15 12h4M7 16h10"/></svg>' +
                    'Biodata Saya' +
                '</div>' +
                '<div class="peserta-popup-topbar-actions">' +
                    '<button class="peserta-popup-back" onclick="closePesertaBiodata()" title="Kembali ke Portal Peserta">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>' +
                        '<span>Kembali<span class="peserta-popup-back-ext"> ke Portal</span></span>' +
                    '</button>' +
                    '<button class="peserta-popup-close" onclick="closePesertaBiodata()" title="Tutup">×</button>' +
                '</div>' +
            '</div>' +
            '<div class="peserta-popup-body" id="peserta-biodata-body" style="overflow-y:auto; padding:1.5rem 1.2rem 2.5rem;"></div>';
        document.body.appendChild(popup);
        return popup;
    }

    function renderLoading() {
        const body = document.getElementById('peserta-biodata-body');
        if (body) {
            body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:4rem 1rem;color:#64748b;">' +
                '<div class="spinner" style="width:34px;height:34px;border:3px solid #e2e8f0;border-top-color:#059669;border-radius:50%;animation:spin 1s linear infinite;"></div>' +
                '<div style="font-weight:600;">Memuat biodata Anda...</div></div>';
        }
    }

    function renderError(pesan, perluPatch) {
        const body = document.getElementById('peserta-biodata-body');
        if (!body) return;
        body.innerHTML = '<div style="max-width:560px;margin:2.5rem auto;background:white;border:1px solid #fecaca;border-radius:18px;padding:1.6rem;text-align:center;">' +
            '<div style="font-size:2.2rem;margin-bottom:8px;">⚠️</div>' +
            '<div style="font-weight:700;color:#b91c1c;margin-bottom:8px;">Gagal memuat biodata</div>' +
            '<div style="color:#475569;font-size:0.9rem;line-height:1.6;">' + escHtml(pesan) + '</div>' +
            (perluPatch
                ? '<div style="margin-top:14px;background:#fef9c3;border:1px solid #fde68a;color:#854d0e;border-radius:12px;padding:12px 14px;font-size:0.85rem;text-align:left;line-height:1.6;">👑 <b>Untuk Admin:</b> jalankan sekali <b>sql/PATCH-BIODATA-AJUKAN-SEKALI.sql</b> di Supabase SQL Editor agar fitur Biodata aktif.</div>'
                : '') +
            '</div>';
    }

    /** Hero identitas: foto, nama, NIK, no register, status */
    function renderHero(akun, sub) {
        const foto = (sub && sub.foto_peserta) || akun.foto_url || '';
        const nama = (sub && sub.nama_lengkap) || akun.nama || akun.username || 'Peserta';
        const nik = (sub && sub.nik) || akun.nik || '';
        return '<div style="background:linear-gradient(135deg,#059669,#047857);border-radius:20px;padding:1.6rem 1.4rem;color:white;box-shadow:0 10px 26px rgba(5,150,105,0.28);">' +
            '<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;">' +
                (foto
                    ? '<div style="width:92px;height:92px;border-radius:50%;background-size:cover;background-position:center;border:3px solid rgba(255,255,255,0.85);box-shadow:0 4px 14px rgba(0,0,0,0.2);flex-shrink:0;background-image:url(\'' + escHtml(foto).replace(/'/g, '%27') + '\');background-color:#d1fae5;"></div>'
                    : '<div style="width:92px;height:92px;border-radius:50%;background:rgba(255,255,255,0.16);border:3px solid rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;font-size:2.6rem;flex-shrink:0;">👤</div>') +
                '<div style="flex:1;min-width:200px;">' +
                    '<div style="font-size:0.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;margin-bottom:2px;">Biodata Peserta</div>' +
                    '<div style="font-size:1.35rem;font-weight:800;line-height:1.25;overflow-wrap:anywhere;">' + escHtml(nama) + '</div>' +
                    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">' +
                        (nik ? '<span style="background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.4);padding:5px 12px;border-radius:999px;font-size:0.75rem;font-weight:700;font-family:ui-monospace,Menlo,monospace;letter-spacing:0.05em;">NIK ' + escHtml(nik) + '</span>' : '') +
                        (sub && sub.no_register ? '<span style="background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.4);padding:5px 12px;border-radius:999px;font-size:0.75rem;font-weight:700;font-family:ui-monospace,Menlo,monospace;">No. ' + escHtml(sub.no_register) + '</span>' : '') +
                    '</div>' +
                '</div>' +
                '<div style="flex-shrink:0;">' + (sub ? statusBadge(sub.status) : '') + '</div>' +
            '</div>' +
            (sub && sub.created_at
                ? '<div style="margin-top:14px;padding-top:12px;border-top:1px dashed rgba(255,255,255,0.35);font-size:0.8rem;opacity:0.95;font-weight:600;">📅 Diajukan pada ' + escHtml(fmtTanggal(sub.created_at)) + '</div>'
                : '') +
        '</div>';
    }

    function renderEmptyState() {
        return '<div style="background:#f0fdf4;border:1.5px dashed #86efac;border-radius:18px;padding:1.8rem 1.4rem;text-align:center;">' +
            '<div style="font-size:2.4rem;margin-bottom:10px;">🗂️</div>' +
            '<div style="font-weight:800;color:#166534;font-size:1.05rem;margin-bottom:6px;">Belum ada data pengajuan</div>' +
            '<div style="color:#15803d;font-size:0.9rem;line-height:1.7;">Biodata pengajuan Anda akan tampil di halaman ini setelah Anda mengisi kartu <b>Ajukan Rekomendasi</b>. Data yang tampil sama persis dengan data pada menu Data Pengajuan (hanya dapat dilihat, tidak dapat diubah).</div>' +
        '</div>';
    }

    function renderBiodata(akun, sub) {
        const body = document.getElementById('peserta-biodata-body');
        if (!body) return;
        const grid = (fieldsHtml) => '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;">' + fieldsHtml + '</div>';

        let html = '<div style="max-width:860px;margin:0 auto;display:grid;gap:16px;">';
        html += renderHero(akun, sub);

        if (!sub) {
            html += renderEmptyState();
        } else {
            // Data Pribadi — sama persis dengan menu Data Pengajuan
            html += sectionCard('🧑', '#dcfce7', 'Data Pribadi', grid(
                fieldBlock('NIK', sub.nik, { mono: true }) +
                fieldBlock('Nama Lengkap (sesuai KTP)', sub.nama_lengkap) +
                fieldBlock('Tempat Lahir', sub.tempat_lahir) +
                fieldBlock('Tanggal Lahir', fmtTanggal(sub.tanggal_lahir)) +
                fieldBlock('Alamat KTP', sub.alamat_ktp, { full: true, plain: true }) +
                fieldBlock('Alamat Domisili (saat ini)', sub.alamat_domisili, { full: true, plain: true }) +
                fieldBlock('Lama Domisili', sub.lama_domisili)
            ));

            // Data Pekerjaan
            html += sectionCard('💼', '#fef3c7', 'Data Pekerjaan', grid(
                fieldBlock('Pekerjaan', sub.pekerjaan) +
                fieldBlock('Posisi', sub.posisi) +
                fieldBlock('Unit Kerja / Institusi Asal', sub.unit_kerja) +
                fieldBlock('Penjelasan / Narasi Singkat', sub.penjelasan, { full: true, plain: true })
            ));

            // Rencana Studi
            html += sectionCard('🎓', '#fae8ff', 'Rencana Studi', grid(
                fieldBlock('Jurusan Tujuan', sub.jurusan_tujuan) +
                fieldBlock('Jenjang Pendidikan', sub.jenjang_pendidikan) +
                fieldBlock('Unit Tujuan Pemanfaatan', sub.unit_tujuan) +
                fieldBlock('Rencana Tahun Studi', sub.rencana_tahun)
            ));

            // Kontak
            html += sectionCard('📞', '#dbeafe', 'Informasi Kontak', grid(
                fieldBlock('Nomor Handphone', sub.no_hp, { mono: true }) +
                fieldBlock('Nomor WhatsApp', sub.no_wa, { mono: true }) +
                fieldBlock('Email Aktif', sub.email, { mono: true })
            ));

            // Dokumen
            const dokumenHtml = '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
                docButton(sub.foto_peserta, 'Lihat Foto Pasfoto') +
                docButton(sub.dokumen_kelengkapan, 'Lihat Dokumen Kelengkapan (PDF)') +
                docButton(sub.rekomendasi_dinkes, 'Lihat Rekomendasi Dinkes') +
                ((!sub.foto_peserta && !sub.dokumen_kelengkapan && !sub.rekomendasi_dinkes)
                    ? '<span style="color:#94a3b8;font-size:0.85rem;font-weight:600;">Tidak ada lampiran dokumen.</span>' : '') +
            '</div>';
            html += sectionCard('📎', '#fee2e2', 'Dokumen Terlampir', dokumenHtml);
        }

        html += '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:12px 16px;color:#1e40af;font-size:0.83rem;font-weight:600;line-height:1.6;">🔒 Data hanya dapat <b>dilihat (view)</b> oleh peserta. Perubahan data dilakukan oleh admin/operator melalui menu Data Pengajuan.</div>';
        html += '</div>';
        body.innerHTML = html;
    }

    // ============================================================
    // PENGAMBILAN DATA
    // ============================================================
    async function ambilBiodata() {
        const token = getPesertaToken();
        const session = pastikanSesiPeserta();
        const client = getClient();
        if (!token || !session) { throw { pesan: 'Sesi berakhir. Silakan logout lalu login kembali.', perluPatch: false }; }
        if (!client) { throw { pesan: 'Koneksi database tidak tersedia. Periksa internet Anda.', perluPatch: false }; }

        // 1) Jalur utama: RPC server-side (hanya bisa melihat data sendiri)
        const res = await client.rpc('peserta_get_biodata', { p_token: token });
        if (res && !res.error && res.data && res.data.ok) {
            return { akun: res.data.akun || {}, sub: res.data.pengajuan || null };
        }

        // 2) Fallback: RPC belum terpasang (PGRST202) → coba baca langsung
        //    dari submissions bila NIK tersedia di sesi.
        if (res && isRpcMissing(res.error)) {
            const nik = String(session.nik || '').trim();
            if (nik && /^\d{16}$/.test(nik)) {
                const q = await client.from('submissions')
                    .select('*')
                    .eq('nik', nik)
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (!q.error && q.data && q.data.length) {
                    console.warn('[BIODATA] RPC belum terpasang — memakai baca langsung (jalankan PATCH-BIODATA-AJUKAN-SEKALI.sql untuk pengalaman penuh).');
                    return { akun: session, sub: q.data[0] };
                }
                if (q.error) {
                    throw { pesan: q.error.message || 'Gagal membaca data pengajuan.', perluPatch: true };
                }
                return { akun: session, sub: null };
            }
            throw { pesan: 'Fitur biodata belum aktif di server.', perluPatch: true };
        }

        throw { pesan: (res && res.error && res.error.message) || 'Gagal memuat biodata.', perluPatch: false };
    }

    async function openPesertaBiodata() {
        const session = pastikanSesiPeserta();
        if (!session) {
            toast('🔐 Silakan login terlebih dahulu', 'error');
            if (typeof openPesertaLogin === 'function') openPesertaLogin();
            return;
        }
        if (typeof closePesertaInfoModal === 'function') {
            try { closePesertaInfoModal(); } catch (e) { /* abaikan */ }
        }

        pastikanPopup();
        renderLoading();
        const popup = document.getElementById('peserta-biodata-popup');
        popup.classList.add('show');
        document.body.style.overflow = 'hidden';
        console.log('[BIODATA PESERTA] Popup biodata dibuka');

        try {
            const data = await ambilBiodata();
            renderBiodata(data.akun, data.sub);
        } catch (err) {
            console.error('[BIODATA PESERTA] Gagal memuat:', err);
            renderError((err && err.pesan) || (err && err.message) || 'Terjadi kesalahan. Coba lagi.', !!(err && err.perluPatch));
        }
    }

    function closePesertaBiodata() {
        const popup = document.getElementById('peserta-biodata-popup');
        if (popup) popup.classList.remove('show');
        document.body.style.overflow = '';
    }

    // ============================================================
    // EXPORT GLOBAL
    // ============================================================
    window.openPesertaBiodata = openPesertaBiodata;
    window.closePesertaBiodata = closePesertaBiodata;

    console.log('[BIODATA PESERTA] 📦 Modul Biodata Peserta (view-only) siap');
})();
