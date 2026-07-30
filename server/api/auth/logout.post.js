import { writeAuditLog } from '../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session?.user) {
    await writeAuditLog({
      user: session.user,
      aksi: 'logout',
      event,
    })
  }
  await clearUserSession(event)
  return { ok: true }
})
