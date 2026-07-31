import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { nomorCounter } from '../../db/schema/index.js'
import { can, requireAuthUser } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'
import { formatNomorSurat } from '../../utils/nomor-generator.js'
import { getSettingsMap } from '../../utils/settings.js'

const schema = z.object({
  unitKode: z.string().min(1).max(20),
  tahun: z.number().int().min(2000).max(2100),
  bulan: z.number().int().min(1).max(12),
  /** Nilai counter terakhir (surat berikutnya = counter + 1) */
  counter: z.number().int().min(0).max(999999),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat') && !can(user.level, 'pengaturan')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const body = schema.parse(await readBody(event))
  const db = useDb()
  const unitKode = body.unitKode.trim().toUpperCase()

  const existing = await db.query.nomorCounter.findFirst({
    where: and(
      eq(nomorCounter.unitKode, unitKode),
      eq(nomorCounter.tahun, body.tahun),
      eq(nomorCounter.bulan, body.bulan),
    ),
  })

  let row
  if (existing) {
    ;[row] = await db
      .update(nomorCounter)
      .set({ counter: body.counter })
      .where(eq(nomorCounter.id, existing.id))
      .returning()
  }
  else {
    ;[row] = await db
      .insert(nomorCounter)
      .values({
        unitKode,
        tahun: body.tahun,
        bulan: body.bulan,
        counter: body.counter,
      })
      .returning()
  }

  const settings = await getSettingsMap()
  const date = new Date(body.tahun, body.bulan - 1, 1)

  await writeAuditLog({
    user,
    aksi: 'edit',
    detail: {
      entity: 'nomor_counter',
      unitKode,
      tahun: body.tahun,
      bulan: body.bulan,
      counter: body.counter,
    },
    event,
  })

  return {
    data: {
      ...row,
      contohTerakhir: body.counter > 0
        ? formatNomorSurat({
            format: settings.nomor_format,
            seq: body.counter,
            seqPad: settings.nomor_seq_pad,
            unitKode,
            date,
          })
        : null,
      contohBerikutnya: formatNomorSurat({
        format: settings.nomor_format,
        seq: body.counter + 1,
        seqPad: settings.nomor_seq_pad,
        unitKode,
        date,
      }),
    },
  }
})
