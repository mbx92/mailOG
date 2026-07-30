import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { instansi, statusAktifEnum } from './instansi.js'

export const unit = pgTable(
  'unit',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    instansiId: uuid('instansi_id')
      .notNull()
      .references(() => instansi.id),
    parentUnitId: uuid('parent_unit_id'),
    kode: varchar('kode', { length: 20 }).notNull(),
    nama: varchar('nama', { length: 255 }).notNull(),
    kepalaUnitId: uuid('kepala_unit_id'),
    status: statusAktifEnum('status').notNull().default('aktif'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('unit_instansi_kode_idx').on(t.instansiId, t.kode),
  ],
)

export const unitRelations = relations(unit, ({ one, many }) => ({
  instansi: one(instansi, {
    fields: [unit.instansiId],
    references: [instansi.id],
  }),
  parent: one(unit, {
    fields: [unit.parentUnitId],
    references: [unit.id],
    relationName: 'unitHierarchy',
  }),
  children: many(unit, { relationName: 'unitHierarchy' }),
}))
