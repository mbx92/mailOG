import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { createError } from 'h3'
import * as schema from './schema/index.js'

let _db = null

export function useDb() {
  if (_db) return _db

  const url = process.env.DATABASE_URL || ''
  if (!url) {
    // Prefer runtimeConfig when available (Nitro-transformed callers)
    try {
      // eslint-disable-next-line no-undef
      const config = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : null
      if (config?.databaseUrl) {
        return connect(config.databaseUrl)
      }
    }
    catch {
      // ignore
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'DATABASE_URL is not configured',
    })
  }

  return connect(url)
}

function connect(url) {
  const client = postgres(url, { max: 10 })
  _db = drizzle(client, { schema })
  return _db
}
