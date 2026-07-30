import { z } from 'zod'
import { useDb } from '../../db/index.js'
import { lampiran } from '../../db/schema/index.js'
import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

const schema = z.object({
  suratId: z.string().uuid(),
  jenis: z.enum(['masuk', 'keluar']),
  namaFile: z.string().min(1),
  path: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'registrasi_surat')

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const [row] = await db
    .insert(lampiran)
    .values({
      suratId: body.suratId,
      jenis: body.jenis,
      namaFile: body.namaFile,
      path: body.path,
      mimeType: body.mimeType,
      size: body.size,
      uploadedBy: user.id,
    })
    .returning()

  await writeAuditLog({
    user,
    suratId: body.suratId,
    aksi: 'upload',
    detail: { lampiranId: row.id, namaFile: row.namaFile },
    event,
  })

  return { data: row }
})
