import {
  pgTable,
  uuid,
  varchar,
  smallint,
  timestamp,
} from 'drizzle-orm/pg-core'

export const klasifikasiSurat = pgTable('klasifikasi_surat', {
  id: uuid('id').defaultRandom().primaryKey(),
  nama: varchar('nama', { length: 100 }).notNull(),
  warna: varchar('warna', { length: 7 }).notNull().default('#5f5f5f'),
  urutan: smallint('urutan').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
