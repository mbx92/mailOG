import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { createError } from 'h3'
import * as schema from './schema/index.js'

let _db = null

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  try {
    // Tersedia jika file di-bundle Nitro dengan auto-import
    if (typeof useRuntimeConfig === 'function') {
      return useRuntimeConfig().databaseUrl || ''
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

  const client = postgres(url, { max: 10 })
  _db = drizzle(client, { schema })
  return _db
}
