import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { instansi } from './instansi.js'
import { unit } from './unit.js'
import { users } from './users.js'
import { klasifikasiSurat } from './klasifikasi.js'

export const suratMasukStatusEnum = pgEnum('surat_masuk_status', [
  'baru',
  'diproses',
  'disposisi',
  'selesai',
  'arsip',
])

export const suratMasuk = pgTable('surat_masuk', {
  id: uuid('id').defaultRandom().primaryKey(),
  nomorSurat: varchar('nomor_surat', { length: 100 }).notNull(),
  perihal: varchar('perihal', { length: 255 }).notNull(),
  isiRingkasan: text('isi_ringkasan'),
  asalInstansiId: uuid('asal_instansi_id').references(() => instansi.id),
  asalUnitId: uuid('asal_unit_id').references(() => unit.id),
  pengirim: varchar('pengirim', { length: 255 }),
  tanggalSurat: date('tanggal_surat').notNull(),
  tanggalDiterima: date('tanggal_diterima').notNull(),
  tujuanUnitId: uuid('tujuan_unit_id').references(() => unit.id),
  klasifikasiId: uuid('klasifikasi_id').references(() => klasifikasiSurat.id),
  status: suratMasukStatusEnum('status').notNull().default('baru'),
  catatanInternal: text('catatan_internal'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const suratMasukRelations = relations(suratMasuk, ({ one }) => ({
  asalInstansi: one(instansi, {
    fields: [suratMasuk.asalInstansiId],
    references: [instansi.id],
  }),
  tujuanUnit: one(unit, {
    fields: [suratMasuk.tujuanUnitId],
    references: [unit.id],
  }),
  klasifikasi: one(klasifikasiSurat, {
    fields: [suratMasuk.klasifikasiId],
    references: [klasifikasiSurat.id],
  }),
  creator: one(users, {
    fields: [suratMasuk.createdBy],
    references: [users.id],
  }),
}))
