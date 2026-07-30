import { requireAuthUser, requirePermission } from '../../utils/rbac.js'
import { getSettingsMap, toAdminSettings } from '../../utils/settings.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'pengaturan')
  const map = await getSettingsMap()
  return { data: toAdminSettings(map) }
})
