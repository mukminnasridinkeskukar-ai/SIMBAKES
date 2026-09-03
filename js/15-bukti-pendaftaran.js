// ============================================================
// SIMBAKES - MODULE 15: BUKTI PENDAFTARAN
// Menerbitkan bukti pendaftaran (print/PDF) setelah pengajuan
// berhasil dikirim, dan memungkinkan cetak ulang via Cek Status.
// Sumber data: tabel submissions (Supabase) — satu sumber kebenaran.
// ============================================================

// Cache record terakhir yang berhasil disubmit (diisi oleh 04-form.js)
window.__buktiLastRecord = null;

/**
 * Ambil record submissions berdasarkan nomor register
 * @param {string} noRegister
 * @returns {Promise<Object|null>}
 */
async function fetchSubmissionByRegister(noRegister) {
    if (!supabaseClient || !noRegister) return null;
    const { data, error } = await supabaseClient
        .from('submissions')
        .select('*')
        .eq('no_register', noRegister)
        .limit(1);
    if (error) throw error;
    return (data && data[0]) || null;
}

/**
 * Format tanggal ISO (YYYY-MM-DD) -> "DD Month YYYY" (Indonesia)
 */
function formatTanggalIndo(value) {
    if (!value) return '-';
    const s = String(value).trim();
    // Ambil bagian tanggal saja bila ada waktu
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const bulan = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    if (iso) {
        const [, y, m, d] = iso;
        return `${parseInt(d, 10)} ${bulan[parseInt(m, 10)] || m} ${y}`;
    }
    // Sudah dalam format Indonesia? kembalikan apa adanya
    return s;
}

/**
 * Escape HTML untuk keamanan-render bukti
 */
function escBukti(v) {
    if (v === null || v === undefined) return '-';
    const s = String(v).trim();
    if (!s || s === '-') return '-';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Bangun HTML bukti pendaftaran siap-cetak (A4)
 * @param {Object} rec - row tabel submissions
 */
function buildBuktiHTML(rec) {
    const dicetak = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const lampiran = [];
    if (rec.foto_peserta) lampiran.push('Foto Pasfoto');
    if (rec.dokumen_kelengkapan) {
        const n = String(rec.dokumen_kelengkapan).split('\n').filter(x => x.trim()).length;
        lampiran.push(n + ' Dokumen PDF');
    }

    const row = (label, value) => `
        <tr>
            <td class="lbl">${escBukti(label)}</td>
            <td class="sep">:</td>
            <td class="val">${escBukti(value)}</td>
        </tr>`;

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Bukti Pendaftaran ${escBukti(rec.no_register)} - SIMBAKES</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: Tahoma, Geneva, Verdana, sans-serif;
        background: #f1f5f9; color: #1e293b;
        display: flex; justify-content: center; padding: 24px 12px;
    }
    .sheet {
        width: 210mm; max-width: 100%; background: #fff;
        padding: 14mm 16mm; box-shadow: 0 4px 24px rgba(0,0,0,.12);
        border-top: 8px solid #059669;
    }
    .kop { display: flex; align-items: center; gap: 14px; border-bottom: 3px double #059669; padding-bottom: 12px; }
    .logo {
        width: 64px; height: 64px; border-radius: 50%;
        background: linear-gradient(135deg, #059669, #10b981);
        color: #fff; display: flex; align-items: center; justify-content: center;
        font-size: 22px; font-weight: bold; flex-shrink: 0;
    }
    .kop-text h1 { font-size: 20px; color: #065f46; letter-spacing: 1px; }
    .kop-text p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .judul {
        text-align: center; margin: 22px 0 6px;
        font-size: 17px; font-weight: bold; color: #065f46; letter-spacing: 2px;
    }
    .reg-box {
        margin: 14px auto 20px; padding: 12px 18px; width: fit-content;
        border: 2px dashed #059669; border-radius: 10px; background: #ecfdf5;
        text-align: center;
    }
    .reg-box .reg-label { font-size: 10px; color: #047857; letter-spacing: 1px; }
    .reg-box .reg-number {
        font-family: 'Courier New', monospace; font-size: 20px;
        font-weight: bold; color: #065f46; letter-spacing: 1px; margin-top: 2px;
    }
    table.data { width: 100%; border-collapse: collapse; margin-top: 4px; }
    table.data td { padding: 5px 6px; vertical-align: top; font-size: 12.5px; }
    td.lbl { width: 190px; color: #475569; }
    td.sep { width: 12px; color: #64748b; }
    td.val { font-weight: 600; color: #0f172a; }
    .section-title {
        margin: 18px 0 6px; font-size: 12px; font-weight: bold; color: #059669;
        text-transform: uppercase; letter-spacing: 1px;
        border-bottom: 1px solid #d1fae5; padding-bottom: 4px;
    }
    .status-chip {
        display: inline-block; padding: 4px 14px; border-radius: 20px;
        background: #fef3c7; color: #92400e; font-size: 12px; font-weight: bold;
    }
    .lampiran { font-size: 12px; color: #334155; margin-top: 4px; }
    .catatan {
        margin-top: 20px; padding: 12px 14px; border-left: 4px solid #f59e0b;
        background: #fffbeb; font-size: 11.5px; color: #78350f; line-height: 1.6;
    }
    .footer {
        margin-top: 26px; display: flex; justify-content: space-between;
        font-size: 11px; color: #64748b; align-items: flex-end;
    }
    .ttd { text-align: center; font-size: 11.5px; color: #334155; }
    .ttd .space { height: 52px; }
    .ttd .nama { font-weight: bold; text-decoration: underline; }
    @media print {
        body { background: #fff; padding: 0; }
        .sheet { box-shadow: none; width: auto; padding: 10mm 12mm; }
        .no-print { display: none !important; }
    }
    .toolbar { text-align: center; margin-bottom: 14px; }
    .toolbar button {
        padding: 10px 26px; background: #059669; color: #fff; border: none;
        border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
        font-family: inherit; margin: 0 6px;
    }
    .toolbar button.secondary { background: #64748b; }
</style>
</head>
<body>
<div class="sheet">
    <div class="kop">
        <div class="logo">SB</div>
        <div class="kop-text">
            <h1>SIMBAKES</h1>
            <p>Sistem Informasi Beasiswa Tematik Bidang Kesehatan</p>
            <p>Dinas Kesehatan Provinsi Kalimantan Timur</p>
        </div>
    </div>

    <div class="judul">BUKTI PENDAFTARAN</div>
    <div class="reg-box">
        <div class="reg-label">NOMOR REGISTER</div>
        <div class="reg-number">${escBukti(rec.no_register)}</div>
    </div>

    <div class="section-title">Informasi Pendaftaran</div>
    <table class="data">
        ${row('Tanggal Pengajuan', formatTanggalIndo(rec.tanggal_pengajuan))}
        ${row('Status Pengajuan', '')}
    </table>
    <p style="margin-top:-27px;margin-left:202px;">
        <span class="status-chip">${escBukti(rec.status || 'Proses Verifikasi')}</span>
    </p>

    <div class="section-title">Data Pribadi</div>
    <table class="data">
        ${row('Nama Lengkap', rec.nama_lengkap)}
        ${row('NIK', rec.nik)}
        ${row('Tempat, Tanggal Lahir', (rec.tempat_lahir ? rec.tempat_lahir + ', ' : '') + formatTanggalIndo(rec.tanggal_lahir))}
        ${row('Pekerjaan / Posisi', [rec.pekerjaan, rec.posisi].filter(Boolean).join(' — '))}
        ${row('Alamat Domisili', rec.alamat_domisili)}
    </table>

    <div class="section-title">Pengajuan Beasiswa</div>
    <table class="data">
        ${row('Jurusan Tujuan', rec.jurusan_tujuan)}
        ${row('Jenjang Pendidikan', rec.jenjang_pendidikan)}
        ${row('Perguruan/Unit Tujuan', rec.unit_tujuan)}
        ${row('Rencana Tahun Studi', rec.rencana_tahun)}
        ${row('Unit Kerja Saat Ini', rec.unit_kerja)}
    </table>

    <div class="section-title">Kontak</div>
    <table class="data">
        ${row('No. HP / WhatsApp', [rec.no_hp, rec.no_wa].filter(Boolean).join(' / '))}
        ${row('Email', rec.email)}
    </table>

    <div class="section-title">Kelengkapan Dokumen</div>
    <p class="lampiran">${lampiran.length ? '✅ Terlampir: ' + lampiran.join(', ') : '⚠️ Tidak ada dokumen terlampir'}</p>

    <div class="catatan">
        <b>Penting:</b> Simpan bukti pendaftaran ini. Gunakan Nomor Register untuk
        memantau status pengajuan melalui menu <b>Cek Status Pengajuan</b> di
        simbakes.mukminnasri.com. Peserta yang lolos seleksi akan ditetapkan melalui
        Surat Keputusan (SK) resmi.
    </div>

    <div class="footer">
        <div>Dicetak: ${escBukti(dicetak)}<br>via SIMBAKES — bukti resmi pendaftaran</div>
        <div class="ttd">
            Panitia Seleksi SIMBAKES
            <div class="space"></div>
            <span class="nama">Sekretariat</span>
        </div>
    </div>
</div>

<div class="toolbar no-print">
    <button onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
    <button class="secondary" onclick="window.close()">Tutup</button>
</div>

<script>
    // Auto-print sekali setelah dokumen siap
    window.addEventListener('load', function () {
        setTimeout(function () { try { window.print(); } catch (e) {} }, 400);
    });
<\/script>
</body>
</html>`;
}

/**
 * Cetak bukti dengan fallback: popup window -> hidden iframe
 */
function printHTMLDocument(html) {
    const w = window.open('', '_blank', 'width=920,height=1050');
    if (w && w.document) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        return true;
    }
    // Fallback: iframe tersembunyi (popup diblokir)
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
        try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { console.error(e); }
    }, 500);
    showToast('🖨️ Bukti pendaftaran disiapkan — dialog cetak akan terbuka', 'info', 4000);
    return true;
}

/**
 * Entry point: terbitkan bukti pendaftaran.
 * @param {Object|string} source - record lengkap ATAU nomor register (string)
 */
async function openBuktiPendaftaran(source) {
    try {
        let rec = null;

        if (typeof source === 'string') {
            showToast('⏳ Mengambil data pengajuan...', 'info', 2000);
            rec = await fetchSubmissionByRegister(source);
        } else if (source && typeof source === 'object' && source.no_register) {
            rec = source;
        } else if (window.__buktiLastRecord) {
            rec = window.__buktiLastRecord;
        }

        // Fallback terakhir: nomor register dari modal sukses
        if (!rec) {
            const regEl = document.getElementById('success-reg-number');
            const regNo = regEl ? regEl.textContent.trim() : '';
            if (regNo && regNo.includes('REG-')) {
                rec = await fetchSubmissionByRegister(regNo);
            }
        }

        if (!rec || !rec.no_register) {
            showToast('❌ Data pengajuan tidak ditemukan. Periksa koneksi lalu cek status untuk mencetak ulang.', 'error', 5000);
            return;
        }

        printHTMLDocument(buildBuktiHTML(rec));
        console.log('[SIMBAKES] 🧾 Bukti pendaftaran diterbitkan untuk:', rec.no_register);

    } catch (err) {
        console.error('[SIMBAKES] Error menerbitkan bukti pendaftaran:', err);
        showToast('❌ Gagal menerbitkan bukti: ' + (err.message || 'kesalahan tak dikenal'), 'error', 5000);
    }
}

/** Dipanggil dari tombol di modal sukses (04-form.js mengisi __buktiLastRecord) */
function printBuktiFromSuccess() {
    const regEl = document.getElementById('success-reg-number');
    const regNo = regEl ? regEl.textContent.trim() : '';
    return openBuktiPendaftaran(window.__buktiLastRecord || regNo);
}

/** Dipanggil dari tombol di hasil Cek Status (09-cek-status.js) */
function printBuktiFromStatus() {
    if (typeof currentSearchResult !== 'undefined' && currentSearchResult) {
        return openBuktiPendaftaran(currentSearchResult);
    }
    showToast('❌ Tidak ada data pengajuan untuk dicetak', 'error');
}

// Expose global
window.openBuktiPendaftaran = openBuktiPendaftaran;
window.printBuktiFromSuccess = printBuktiFromSuccess;
window.printBuktiFromStatus = printBuktiFromStatus;
console.log('[SIMBAKES] ✅ Module 15: Bukti Pendaftaran loaded');
