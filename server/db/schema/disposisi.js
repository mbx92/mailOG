import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { suratMasuk } from './surat-masuk.js'
import { users } from './users.js'
import { unit } from './unit.js'

export const disposisiStatusEnum = pgEnum('disposisi_status', [
  'diterima',
  'diproses',
  'selesai',
  'diteruskan',
])

export const disposisi = pgTable('disposisi', {
  id: uuid('id').defaultRandom().primaryKey(),
  suratId: uuid('surat_id')
    .notNull()
    .references(() => suratMasuk.id),
  dariUserId: uuid('dari_user_id')
    .notNull()
    .references(() => users.id),
  keUserId: uuid('ke_user_id').references(() => users.id),
  keUnitId: uuid('ke_unit_id').references(() => unit.id),
  instruksi: text('instruksi'),
  batasWaktu: date('batas_waktu'),
  status: disposisiStatusEnum('status').notNull().default('diterima'),
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
