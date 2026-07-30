import { useDb } from '../db/index.js'
import { trackingLog } from '../db/schema/index.js'

/**
 * Write audit row. Never throws — logging must not break the main request
 * (e.g. stale session user_id after DB clear/migrate).
 */
export async function writeAuditLog(opts) {
  try {
    const db = useDb()
    const headers = opts.event ? getRequestHeaders(opts.event) : {}

    await db.insert(trackingLog).values({
      suratId: opts.suratId ?? null,
      userId: opts.user?.id ?? null,
      aksi: opts.aksi,
      detail: opts.detail ?? null,
      ipAddress: opts.event ? getRequestIP(opts.event, { xForwardedFor: true }) : null,
      userAgent: headers['user-agent'] ?? null,
    })
  }
  catch (err) {
    console.warn('[audit] skip:', err?.message || err)
  }
}
