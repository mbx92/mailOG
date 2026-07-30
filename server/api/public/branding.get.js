import { getSettingsMap, toPublicSettings } from '../../utils/settings.js'

export default defineEventHandler(async () => {
  try {
    const map = await getSettingsMap()
    return { data: toPublicSettings(map) }
  }
  catch {
    return {
      data: {
        appName: 'MailOG',
        appLogo: '',
        timezone: 'Asia/Makassar',
      },
    }
  }
})
