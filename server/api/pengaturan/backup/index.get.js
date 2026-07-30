import { mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireAuthUser, requirePermission } from '../../../utils/rbac.js'

const ROOT = fileURLToPath(new URL('../../../..', import.meta.url))
const BACKUP_DIR = join(ROOT, 'backups')

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'pengaturan')

  await mkdir(BACKUP_DIR, { recursive: true })
  const files = await readdir(BACKUP_DIR)
  const items = []
  for (const f of files) {
    if (f.startsWith('.')) continue
    const st = await stat(join(BACKUP_DIR, f))
    if (!st.isFile()) continue
    items.push({
      filename: f,
      size: st.size,
      createdAt: st.mtime.toISOString(),
      downloadUrl: `/api/pengaturan/backup/${encodeURIComponent(f)}`,
    })
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return { data: items }
})
