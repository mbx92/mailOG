import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core'

export const statusAktifEnum = pgEnum('status_aktif', ['aktif', 'nonaktif'])

export const instansi = pgTable('instansi', {
  id: uuid('id').defaultRandom().primaryKey(),
  kode: varchar('kode', { length: 20 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  alamat: text('alamat'),
  logo: varchar('logo', { length: 255 }),
  kontak: varchar('kontak', { length: 100 }),
  status: statusAktifEnum('status').notNull().default('aktif'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
