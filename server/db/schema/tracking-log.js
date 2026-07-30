import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const trackingLog = pgTable(
  'tracking_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    suratId: uuid('surat_id'),
    userId: uuid('user_id').references(() => users.id),
    aksi: varchar('aksi', { length: 50 }).notNull(),
    detail: jsonb('detail'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('tracking_log_created_at_idx').on(t.createdAt)],
)
