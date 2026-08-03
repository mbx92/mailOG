import { humanizeError, looksLikeTechnicalError } from '../utils/humanize-error.js'

/**
 * Sanitize uncaught errors before they reach the client.
 * Logs the original technical message server-side only.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error) => {
    if (!error) return

    const raw = error.statusMessage || error.message || ''
    if (!looksLikeTechnicalError(raw)) return

    console.error('[sanitize-errors]', raw)
    const safe = humanizeError(error)
    error.message = safe
    error.statusMessage = safe
  })
})
