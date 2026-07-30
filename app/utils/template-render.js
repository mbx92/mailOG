/**
 * Apply template placeholders for surat keluar preview / render.
 * Placeholders: {{nomor_surat}}, {{tanggal}}, {{perihal}}, {{penerima}},
 * {{penerima_jabatan}}, {{penerima_alamat}}, {{isi_surat}},
 * {{pengirim_nama}}, {{pengirim_jabatan}}, {{kop_surat}}
 */
export function applyPlaceholders(text, map) {
  return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = map[key]
    return v == null ? '' : String(v)
  })
}

export function renderSuratKeluarHtml(template, surat, extras = {}) {
  const map = {
    nomor_surat: surat?.nomorSurat || '—',
    tanggal: extras.tanggalFormatted || surat?.tanggalSurat || '—',
    perihal: surat?.perihal || '—',
    penerima: surat?.penerima || '—',
    penerima_jabatan: surat?.penerimaJabatan || '',
    penerima_alamat: surat?.penerimaAlamat || '',
    isi_surat: surat?.isiSurat || '',
    pengirim_nama: extras.pengirimNama || '',
    pengirim_jabatan: extras.pengirimJabatan || '',
    kop_surat: template?.kopSurat || '',
  }

  const kop = applyPlaceholders(template?.kopSurat, map)
  const body = applyPlaceholders(template?.bodyTemplate || '{{isi_surat}}', map)
  const footer = applyPlaceholders(template?.footer, map)

  return {
    kop,
    body,
    footer,
    html: [kop, body, footer].filter(Boolean).join('\n'),
  }
}
