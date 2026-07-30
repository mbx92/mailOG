import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

let _db = null

export function useDb() {
  if (_db) return _db

  const config = useRuntimeConfig()
  const url = config.databaseUrl || process.env.DATABASE_URL

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
