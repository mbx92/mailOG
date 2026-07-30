import { hash } from 'bcryptjs'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../server/db/schema/index.js'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mailog:mailog@localhost:5433/mailog'

async function main() {
  const client = postgres(DATABASE_URL, { max: 1 })
  const db = drizzle(client, { schema })

  console.log('Seeding MailOG...')

  let instansiRow = await db.query.instansi.findFirst({
    where: (t, { eq }) => eq(t.kode, 'DEMO'),
  })

  if (!instansiRow) {
    ;[instansiRow] = await db
      .insert(schema.instansi)
      .values({
        kode: 'DEMO',
        nama: 'Instansi Demo MailOG',
        alamat: 'Jl. Contoh No. 1',
        kontak: 'demo@mailog.local',
        status: 'aktif',
      })
      .returning()
  }

  if (!instansiRow) throw new Error('Failed to create instansi')

  let unitRow = await db.query.unit.findFirst({
    where: (t, { and, eq }) => and(eq(t.kode, 'SEKRET'), eq(t.instansiId, instansiRow.id)),
  })

  if (!unitRow) {
    ;[unitRow] = await db
      .insert(schema.unit)
      .values({
        instansiId: instansiRow.id,
        kode: 'SEKRET',
        nama: 'Sekretariat',
        status: 'aktif',
      })
      .returning()
  }

  const existingKlas = await db.query.klasifikasiSurat.findMany()
  if (!existingKlas.length) {
    await db.insert(schema.klasifikasiSurat).values([
      { nama: 'Biasa', warna: '#5f5f5f', urutan: 1 },
      { nama: 'Penting', warna: '#3b82f6', urutan: 2 },
      { nama: 'Segera', warna: '#f59e0b', urutan: 3 },
      { nama: 'Rahasia', warna: '#ff5530', urutan: 4 },
    ])
  }

  const adminEmail = 'admin@mailog.local'
  let admin = await db.query.users.findFirst({
    where: (t, { eq }) => eq(t.email, adminEmail),
  })

  if (!admin) {
    const password = await hash('admin12345', 12)
    ;[admin] = await db
      .insert(schema.users)
      .values({
        nama: 'Super Admin',
        email: adminEmail,
        password,
        level: 1,
        unitId: unitRow.id,
        jabatan: 'Administrator Sistem',
        isActive: true,
      })
      .returning()
  }

  const sekretarisEmail = 'sekretaris@mailog.local'
  const existingSek = await db.query.users.findFirst({
    where: (t, { eq }) => eq(t.email, sekretarisEmail),
  })
  if (!existingSek) {
    const password = await hash('sekretaris123', 12)
    await db.insert(schema.users).values({
      nama: 'Admin Sekretaris',
      email: sekretarisEmail,
      password,
      level: 3,
      unitId: unitRow.id,
      jabatan: 'Sekretaris',
      isActive: true,
    })
  }

  console.log('Seed complete.')
  console.log('  Admin      : admin@mailog.local / admin12345')
  console.log('  Sekretaris : sekretaris@mailog.local / sekretaris123')

  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
