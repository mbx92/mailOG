/**
 * Apply template placeholders for surat keluar preview / render.
 */
export function applyPlaceholders(text, map) {
  return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = map[key]
    return v == null ? '' : String(v)
  })
}

/** Normalize escaped newlines stored as literal "\n" */
export function normalizeNewlines(text) {
  return String(text || '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\r\n/g, '\n')
}

/**
 * Plain / mixed text → HTML.
 * Also handles literal "\n" and TipTap HTML mixed into body templates.
 */
export function toHtmlBlock(text) {
  let t = normalizeNewlines(text)
  if (!t.trim()) return ''

  const hasHtml = /<[a-z][\s\S]*>/i.test(t)
  if (hasHtml) {
    // Keep tags; turn remaining newlines into breaks
    return t.replace(/\n+/g, '<br>')
  }

  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

export function templateAssetUrl(templateId, type) {
  if (!templateId) return null
  return `/api/template/${templateId}/asset?type=${type}`
}

export function renderSuratKeluarHtml(template, surat, extras = {}) {
  const isiRaw = surat?.isiSurat || ''
  const isiHtml = toHtmlBlock(isiRaw)
  const map = {
    nomor_surat: surat?.nomorSurat || '—',
    tanggal: extras.tanggalFormatted || surat?.tanggalSurat || '—',
    perihal: surat?.perihal || '—',
    penerima: surat?.penerima || '—',
    penerima_jabatan: surat?.penerimaJabatan || '',
    penerima_alamat: surat?.penerimaAlamat || '',
    isi_surat: isiHtml,
    pengirim_nama: extras.pengirimNama || '',
    pengirim_jabatan: extras.pengirimJabatan || '',
    kop_surat: template?.kopSurat || '',
  }

  const bodySource = normalizeNewlines(template?.bodyTemplate || '{{isi_surat}}')
  const kopText = toHtmlBlock(applyPlaceholders(normalizeNewlines(template?.kopSurat), map))
  const body = toHtmlBlock(applyPlaceholders(bodySource, map))
  const footerText = toHtmlBlock(applyPlaceholders(normalizeNewlines(template?.footer), map))

  const kopImageUrl = template?.id && template?.kopImage
    ? templateAssetUrl(template.id, 'kop')
    : extras.kopImageUrl || null
  const footerImageUrl = template?.id && template?.footerImage
    ? templateAssetUrl(template.id, 'footer')
    : extras.footerImageUrl || null

  return {
    kopText,
    body,
    footerText,
    kopImageUrl,
    footerImageUrl,
    hasBodyTemplate: Boolean(template?.bodyTemplate?.trim()),
    margin: template?.margin || { top: 20, right: 20, bottom: 20, left: 25 },
    kertas: template?.kertas || 'a4',
    meta: {
      nomorSurat: map.nomor_surat,
      tanggal: map.tanggal,
      perihal: map.perihal,
      penerima: map.penerima,
      penerimaJabatan: map.penerima_jabatan,
      penerimaAlamat: map.penerima_alamat,
      pengirimNama: map.pengirim_nama,
      pengirimJabatan: map.pengirim_jabatan,
    },
  }
}
