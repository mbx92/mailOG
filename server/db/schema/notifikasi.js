import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const notifikasiTipeEnum = pgEnum('notifikasi_tipe', [
  'info',
  'disposisi',
  'approval',
  'system',
])

export const notifikasi = pgTable('notifikasi', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  suratId: uuid('surat_id'),
  judul: varchar('judul', { length: 255 }).notNull(),
  pesan: text('pesan'),
  tipe: notifikasiTipeEnum('tipe').notNull().default('info'),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
