import { z } from 'zod'
import { can, requireAuthUser } from '../../utils/rbac.js'
import { setSettings, getSettingsMap } from '../../utils/settings.js'
import { writeAuditLog } from '../../utils/audit.js'
import { formatNomorSurat } from '../../utils/nomor-generator.js'

const schema = z.object({
  format: z.string().min(3).max(120),
  seqPad: z.number().int().min(1).max(8).optional().default(3),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  if (!can(user.level, 'buat_surat') && !can(user.level, 'pengaturan')) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan' })
  }

  const body = schema.parse(await readBody(event))
  if (!body.format.includes('{SEQ}')) {
    throw createError({ statusCode: 400, statusMessage: 'Format wajib mengandung {SEQ}' })
  }

  await setSettings({
    nomor_format: body.format.trim(),
    nomor_seq_pad: String(body.seqPad),
  })

  const map = await getSettingsMap()
  const contoh = formatNomorSurat({
    format: map.nomor_format,
    seq: 1,
    seqPad: map.nomor_seq_pad,
    unitKode: 'SEKRET',
    date: new Date(),
  })

  await writeAuditLog({
    user,
    aksi: 'edit',
    detail: { entity: 'nomor_format', format: body.format, seqPad: body.seqPad },
    event,
  })

  return {
    data: {
      format: map.nomor_format,
      seqPad: Number(map.nomor_seq_pad) || 3,
      contoh,
    },
  }
})
