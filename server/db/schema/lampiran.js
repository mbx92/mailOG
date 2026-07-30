import {
  pgTable,
  uuid,
  varchar,
  boolean,
  bigint,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const lampiranJenisEnum = pgEnum('lampiran_jenis', ['masuk', 'keluar'])

export const lampiran = pgTable('lampiran', {
  id: uuid('id').defaultRandom().primaryKey(),
  suratId: uuid('surat_id').notNull(),
  jenis: lampiranJenisEnum('jenis').notNull(),
  namaFile: varchar('nama_file', { length: 255 }).notNull(),
  path: varchar('path', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: bigint('size', { mode: 'number' }).notNull().default(0),
  isPublic: boolean('is_public').notNull().default(false),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
