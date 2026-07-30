import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { useDb } from '../../db/index.js'
import { notifikasi } from '../../db/schema/index.js'
import { requireAuthUser } from '../../utils/rbac.js'

const schema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = schema.parse(await readBody(event))
  const db = useDb()

  if (!body.all && !body.ids?.length) {
    throw createError({ statusCode: 400, statusMessage: 'ids atau all wajib' })
  }

  const now = new Date()
  const conditions = [
    eq(notifikasi.userId, user.id),
    eq(notifikasi.isRead, false),
  ]
  if (!body.all) conditions.push(inArray(notifikasi.id, body.ids))

  const updated = await db
    .update(notifikasi)
    .set({ isRead: true, readAt: now })
    .where(and(...conditions))
    .returning({ id: notifikasi.id })

  return { data: { marked: updated.length } }
})
