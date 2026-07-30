import { createReadStream, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireAuthUser, requirePermission } from '../../../utils/rbac.js'

const ROOT = fileURLToPath(new URL('../../../..', import.meta.url))
const BACKUP_DIR = join(ROOT, 'backups')

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'pengaturan')

  const raw = getRouterParam(event, 'filename') || ''
  const filename = basename(decodeURIComponent(raw))
  if (!filename || filename.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'Nama file tidak valid' })
  }

  const full = join(BACKUP_DIR, filename)
  if (!existsSync(full)) {
    throw createError({ statusCode: 404, statusMessage: 'Backup tidak ditemukan' })
  }

  setHeader(event, 'Content-Type', 'application/octet-stream')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return sendStream(event, createReadStream(full))
})
