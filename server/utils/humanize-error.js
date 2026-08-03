import { createError } from 'h3'

/**
 * Convert technical / SQL / ORM errors into short user-facing Indonesian messages.
 * Never expose raw queries or DB internals to the client.
 */

const SQL_HINT =
  /failed\s+query|select\s+|insert\s+into|update\s+|delete\s+from|relation\s+"|column\s+"|syntax\s+error|duplicate\s+key|violates\s+|params:\s*|ECONNREFUSED|ENOTFOUND|connection\s+(refused|terminated)|timeout\s+exceeded/i

export function looksLikeTechnicalError(message) {
  if (!message || typeof message !== 'string') return false
  if (SQL_HINT.test(message)) return true
  if (message.length > 160) return true
  return false
}

export function humanizeError(error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  const statusMessage = error?.statusMessage || error?.data?.statusMessage
  const message = error?.message || error?.data?.message || (typeof error === 'string' ? error : '')

  const preferred = statusMessage || message || ''

  if (!preferred) return fallback

  if (looksLikeTechnicalError(preferred)) {
    if (/does not exist|relation/i.test(preferred)) {
      return 'Database belum siap. Hubungi administrator.'
    }
    if (/ECONNREFUSED|ENOTFOUND|connection/i.test(preferred)) {
      return 'Tidak dapat terhubung ke database. Coba lagi nanti.'
    }
    if (/duplicate\s+key|unique/i.test(preferred)) {
      return 'Data sudah ada. Periksa kembali input Anda.'
    }
    return fallback
  }

  return preferred
}

export function throwHumanError(error, { statusCode = 500, fallback } = {}) {
  const statusMessage = humanizeError(error, fallback)
  console.error('[error]', error?.message || error)
  throw createError({
    statusCode: error?.statusCode && error.statusCode < 500 && !looksLikeTechnicalError(error?.statusMessage || error?.message || '')
      ? error.statusCode
      : statusCode,
    statusMessage,
  })
}
