import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core'

/** Key-value app settings (Super Admin) */
export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const DEFAULT_SETTINGS = {
  app_name: 'MailOG',
  app_logo: '',
  timezone: 'Asia/Makassar',
  storage_driver: 'local',
  upload_dir: 'uploads/surat',
  minio_endpoint: 'localhost',
  minio_port: '9000',
  minio_use_ssl: 'false',
  minio_access_key: '',
  minio_secret_key: '',
  minio_bucket: 'mailog',
  /** Format nomor surat keluar. Token: {SEQ} {UNIT} {MM} {YYYY} {YY} */
  nomor_format: '{SEQ} / {UNIT} / {MM} / {YYYY}',
  nomor_seq_pad: '3',
}
