import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { createError } from 'h3'
import * as schema from './schema/index.js'

let _db = null

function resolveDatabaseUrl() {
  // 1. runtimeConfig (tersedia dalam pipeline Nitro)
  try {
    const config = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : null
    if (config?.databaseUrl) return config.databaseUrl
  }
  catch {
    // not in Nitro pipeline
  }

  // 2. process.env (tersedia di luar pipeline, termasuk worker)
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  // 3. Coba baca .env manual via Nuxt runtime (hanya di dalam Nitro)
  try {
    const config = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : null
    if (config?.nitro?.envPrefix) {
      const key = `${config.nitro.envPrefix}_DATABASE_URL`
      if (process.env[key]) return process.env[key]
    }
  }
  catch {
    // ignore
  }

  return ''
}

export function useDb() {
  if (_db) return _db

  const url = resolveDatabaseUrl()
  if (!url) {
    throw createError({
      statusCode: 500,
      statusMessage: 'DATABASE_URL is not configured',
    })
  }

  return connect(url)
}

function connect(url) {
  // Avoid stale singleton from HMR — recreate if URL changes
  if (_db && _db._url !== url) {
    _db = null
  }
  if (_db) return _db

  const client = postgres(url, { max: 3, idle_timeout: 30, connect_timeout: 10 })
  _db = drizzle(client, { schema })
  _db._url = url
  return _db
}
