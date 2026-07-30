export default defineNitroPlugin(async () => {
  try {
    const { getSettingsMap } = await import('../utils/settings.js')
    const { setStorageSettingsOverlay } = await import('../utils/storage.js')
    const map = await getSettingsMap()
    setStorageSettingsOverlay(map)
  }
  catch (e) {
    console.warn('[settings] overlay skip:', e?.message || e)
  }
})
