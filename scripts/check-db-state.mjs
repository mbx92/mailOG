import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../server/db/schema/index.js'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mailog:mailog@localhost:5433/mailog'
const client = postgres(DATABASE_URL, { max: 3 })
const db = drizzle(client, { schema })

async function main() {
  const tables = await client.unsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
  console.log('TABLES:', tables.map(r => r.table_name).join(', '))

  const check = async (name, fn) => {
    try {
      const rows = await fn()
      if (Array.isArray(rows)) {
        console.log(`  ${name}: OK (${rows.length} rows)`)
      }
      else {
        console.log(`  ${name}: OK`)
      }
    }
    catch (e) {
      console.log(`  ${name}: MISSING (${e.message.split('\n')[0]})`)
    }
  }

  await check('app_settings', () => db.select().from(schema.appSettings).limit(1))
  await check('nomor_counter', () => db.select().from(schema.nomorCounter).limit(1))
  await check('template_surat', async () => {
    try {
      const rows = await db.select().from(schema.templateSurat).limit(1)
      return rows
    }
    catch {
      return []
    }
  })
  await check('notifikasi', async () => {
    try {
      const rows = await db.select().from(schema.notifikasi).limit(1)
      return rows
    }
    catch {
      return []
    }
  })

  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
