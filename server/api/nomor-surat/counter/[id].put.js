import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db/index.js'
import { nomorCounter } from '../../../db/schema/index.js'
import { can, requireAuthUser } from '../../../utils/rbac.js'
import { writeAuditLog } from '../../../utils/audit.js'
import { formatNomorSurat } from '../../../utils/nomor-generator.js'
import { getSettingsMap } from '../../../utils/settings.js'

const schema = z.object({
  counter: z.number().int().min(0).max(999999),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat') && !can(user.level, 'pengaturan')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const body = schema.parse(await readBody(event))
  const db = useDb()

  const [row] = await db
    .update(nomorCounter)
    .set({ counter: body.counter })
    .where(eq(nomorCounter.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Counter tidak ditemukan' })

  const settings = await getSettingsMap()
  const date = new Date(row.tahun, row.bulan - 1, 1)

  await writeAuditLog({
    user,
    aksi: 'edit',
    detail: { entity: 'nomor_counter', id, counter: body.counter },
    event,
  })

  return {
    data: {
      ...row,
      contohTerakhir: row.counter > 0
        ? formatNomorSurat({
            format: settings.nomor_format,
            seq: row.counter,
            seqPad: settings.nomor_seq_pad,
            unitKode: row.unitKode,
            date,
          })
        : null,
      contohBerikutnya: formatNomorSurat({
        format: settings.nomor_format,
        seq: row.counter + 1,
        seqPad: settings.nomor_seq_pad,
        unitKode: row.unitKode,
        date,
      }),
    },
  }
})
