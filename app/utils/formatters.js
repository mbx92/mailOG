import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(value, withTime = false) {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d)
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const STATUS_SURAT_MASUK = {
  baru: { label: 'Baru', class: 'badge-new' },
  diproses: { label: 'Diproses', class: 'badge-beta' },
  disposisi: { label: 'Disposisi', class: 'badge-code' },
  selesai: { label: 'Selesai', class: 'badge-success' },
  arsip: { label: 'Arsip', class: 'badge-muted' },
}

export const STATUS_SURAT_KELUAR = {
  draft: { label: 'Draft', class: 'badge-muted' },
  menunggu_approval: { label: 'Menunggu approval', class: 'badge-warning' },
  disetujui: { label: 'Disetujui', class: 'badge-beta' },
  ditolak: { label: 'Ditolak', class: 'badge-new' },
  dikirim: { label: 'Dikirim', class: 'badge-success' },
  arsip: { label: 'Arsip', class: 'badge-muted' },
}

export const STATUS_DISPOSISI = {
  diterima: { label: 'Belum ditindaklanjuti', class: 'badge-warning' },
  diproses: { label: 'Diproses unit', class: 'badge-beta' },
  selesai: { label: 'Selesai', class: 'badge-success' },
  diteruskan: { label: 'Diteruskan', class: 'badge-code' },
}
