import {
  pgTable,
  uuid,
  varchar,
  smallint,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const nomorCounter = pgTable(
  'nomor_counter',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    unitKode: varchar('unit_kode', { length: 20 }).notNull(),
    tahun: smallint('tahun').notNull(),
    bulan: smallint('bulan').notNull(),
    counter: integer('counter').notNull().default(0),
  },
  (t) => [
    uniqueIndex('nomor_counter_unit_period_idx').on(t.unitKode, t.tahun, t.bulan),
  ],
)
