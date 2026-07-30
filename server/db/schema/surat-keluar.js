import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  boolean,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { instansi } from './instansi.js'
import { unit } from './unit.js'
import { users } from './users.js'
import { klasifikasiSurat } from './klasifikasi.js'

export const suratKeluarStatusEnum = pgEnum('surat_keluar_status', [
  'draft',
  'menunggu_approval',
  'disetujui',
  'ditolak',
  'dikirim',
  'arsip',
])

export const kertasEnum = pgEnum('kertas', ['a4', 'folio', 'legal'])

export const templateSurat = pgTable('template_surat', {
  id: uuid('id').defaultRandom().primaryKey(),
  nama: varchar('nama', { length: 255 }).notNull(),
  kode: varchar('kode', { length: 50 }).notNull().unique(),
  kopSurat: text('kop_surat'),
  bodyTemplate: text('body_template'),
  footer: text('footer'),
  kertas: kertasEnum('kertas').notNull().default('a4'),
  margin: jsonb('margin'),
  unitId: uuid('unit_id').references(() => unit.id),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const suratKeluar = pgTable('surat_keluar', {
  id: uuid('id').defaultRandom().primaryKey(),
  nomorSurat: varchar('nomor_surat', { length: 100 }),
  perihal: varchar('perihal', { length: 255 }).notNull(),
  isiSurat: text('isi_surat'),
  tujuanInstansiId: uuid('tujuan_instansi_id').references(() => instansi.id),
  tujuanUnitId: uuid('tujuan_unit_id').references(() => unit.id),
  penerima: varchar('penerima', { length: 255 }),
  penerimaJabatan: varchar('penerima_jabatan', { length: 100 }),
  penerimaAlamat: text('penerima_alamat'),
  templateId: uuid('template_id').references(() => templateSurat.id),
  tanggalSurat: date('tanggal_surat'),
  unitId: uuid('unit_id').references(() => unit.id),
  klasifikasiId: uuid('klasifikasi_id').references(() => klasifikasiSurat.id),
  status: suratKeluarStatusEnum('status').notNull().default('draft'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  catatanInternal: text('catatan_internal'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const suratKeluarRelations = relations(suratKeluar, ({ one }) => ({
  tujuanInstansi: one(instansi, {
    fields: [suratKeluar.tujuanInstansiId],
    references: [instansi.id],
  }),
  tujuanUnit: one(unit, {
    fields: [suratKeluar.tujuanUnitId],
    references: [unit.id],
    relationName: 'suratKeluarTujuanUnit',
  }),
  unit: one(unit, {
    fields: [suratKeluar.unitId],
    references: [unit.id],
    relationName: 'suratKeluarUnit',
  }),
  template: one(templateSurat, {
    fields: [suratKeluar.templateId],
    references: [templateSurat.id],
  }),
  klasifikasi: one(klasifikasiSurat, {
    fields: [suratKeluar.klasifikasiId],
    references: [klasifikasiSurat.id],
  }),
  creator: one(users, {
    fields: [suratKeluar.createdBy],
    references: [users.id],
  }),
}))
