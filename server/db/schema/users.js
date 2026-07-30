import {
  pgTable,
  uuid,
  varchar,
  boolean,
  smallint,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { unit } from './unit.js'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  unitId: uuid('unit_id').references(() => unit.id),
  nama: varchar('nama', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  level: smallint('level').notNull().default(4),
  jabatan: varchar('jabatan', { length: 100 }),
  noTelp: varchar('no_telp', { length: 20 }),
  avatar: varchar('avatar', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const usersRelations = relations(users, ({ one }) => ({
  unit: one(unit, {
    fields: [users.unitId],
    references: [unit.id],
  }),
}))

/** Level: 1 Super Admin, 2 Direksi, 3 Admin/Sekretaris, 4 Staff, 5 Viewer */
export const USER_LEVELS = {
  SUPER_ADMIN: 1,
  DIREKSI: 2,
  ADMIN: 3,
  STAFF: 4,
  VIEWER: 5,
}

export const USER_LEVEL_LABELS = {
  1: 'Super Admin',
  2: 'Direksi',
  3: 'Admin / Sekretaris',
  4: 'Staff Unit',
  5: 'Viewer',
}
