/**
 * Migrate legacy db_surat (MySQL dump) → MailOG PostgreSQL (+ optional MinIO).
 *
 * Usage:
 *   pnpm db:migrate-legacy              # full import
 *   pnpm db:migrate-legacy -- --dry-run
 *   pnpm db:migrate-legacy -- --skip-files
 *   pnpm db:migrate-legacy -- --clear   # wipe business tables first
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client as MinioClient } from 'minio'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from '../server/db/schema/index.js'
import {
  parseInserts,
  toDate,
  toDateOnly,
  isDeleted,
} from './lib/mysql-dump-parser.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DUMP = join(ROOT, 'db_surat_structure.sql')
const UPLOADS = join(ROOT, 'uploads', 'surat')

const args = new Set(process.argv.slice(2))
const DRY = args.has('--dry-run')
const SKIP_FILES = args.has('--skip-files')
const CLEAR = args.has('--clear')

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mailog:mailog@localhost:5433/mailog'

const MINIO = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'mailog-admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'mailog-secret',
  bucket: process.env.MINIO_BUCKET || 'mailog',
}

/** Old level → MailOG level */
const LEVEL_MAP = {
  1: 1, // admin → Super Admin
  2: 3, // sekretaris → Admin
  3: 2, // direktur → Direksi
  4: 4, // unit → Staff
}

function log(...m) {
  console.log('[migrate]', ...m)
}

function chunk(arr, size = 100) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function uniqueKode(kode, used) {
  let base = String(kode || 'X').trim().toUpperCase().slice(0, 18) || 'X'
  let k = base
  let n = 2
  while (used.has(k)) {
    k = `${base}-${n}`.slice(0, 20)
    n++
  }
  used.add(k)
  return k
}

function mapSuratMasukStatus(row) {
  if (Number(row.smStatusArsip) === 1) return 'arsip'
  if (Number(row.smStatusDisposisi) === 1) return 'disposisi'
  if (Number(row.smStatus) === 1) return 'diproses'
  return 'baru'
}

function mapSuratKeluarStatus(row) {
  if (isDeleted(row.skDeletedDate)) return 'arsip'
  return 'dikirim'
}

function mapDisposisiStatus(dsp, unitRow) {
  if (unitRow?.tanggalKonfirmasi) return 'selesai'
  if (Number(dsp.dspStatus) === 1) return 'selesai'
  return 'diterima'
}

function basenameFromLegacyPath(path) {
  if (!path) return null
  const norm = String(path).replace(/\\/g, '/')
  return basename(norm)
}

async function clearTables(db) {
  log('Clearing business tables...')
  await db.execute(sql`
    TRUNCATE TABLE
      lampiran,
      disposisi,
      tracking_log,
      notifikasi,
      surat_masuk,
      surat_keluar,
      template_surat,
      nomor_counter,
      users,
      unit,
      klasifikasi_surat,
      instansi
    RESTART IDENTITY CASCADE
  `)
}

async function ensureKlasifikasi(db) {
  const existing = await db.select().from(schema.klasifikasiSurat)
  if (existing.length) return existing

  return db
    .insert(schema.klasifikasiSurat)
    .values([
      { nama: 'Biasa', warna: '#5f5f5f', urutan: 1 },
      { nama: 'Penting', warna: '#3b82f6', urutan: 2 },
      { nama: 'Segera', warna: '#f59e0b', urutan: 3 },
      { nama: 'Rahasia', warna: '#ff5530', urutan: 4 },
    ])
    .returning()
}

async function ensureMinio() {
  const client = new MinioClient(MINIO)
  const exists = await client.bucketExists(MINIO.bucket)
  if (!exists) await client.makeBucket(MINIO.bucket)
  return client
}

async function main() {
  log(`Dump: ${DUMP}`)
  if (!existsSync(DUMP)) throw new Error('db_surat_structure.sql tidak ditemukan')

  log('Reading dump (latin1)...')
  const sqlText = await readFile(DUMP, { encoding: 'latin1' })

  log('Parsing tables...')
  const legacy = {
    instansi: parseInserts(sqlText, 't_instansi'),
    divisi: parseInserts(sqlText, 't_divisi'),
    unit: parseInserts(sqlText, 't_unit'),
    user: parseInserts(sqlText, 't_user'),
    suratMasuk: parseInserts(sqlText, 't_surat_masuk'),
    suratKeluar: parseInserts(sqlText, 't_surat_keluar'),
    disposisi: parseInserts(sqlText, 't_disposisi'),
    disposisiUnit: parseInserts(sqlText, 't_disposisi_unit'),
    file: parseInserts(sqlText, 't_file'),
  }

  for (const [k, v] of Object.entries(legacy)) {
    log(`  ${k}: ${v.length} rows`)
  }

  if (DRY) {
    log('Dry-run selesai (tidak menulis DB).')
    return
  }

  const client = postgres(DATABASE_URL, { max: 5 })
  const db = drizzle(client, { schema })

  if (CLEAR) await clearTables(db)

  const klasifikasi = await ensureKlasifikasi(db)
  const klasifikasiDefault = klasifikasi[0]

  // Maps
  const usedKode = new Set()
  /** @type {Map<string, string>} kode → uuid */
  const instansiByKode = new Map()
  /** @type {Map<number, string>} */
  const unitByOldId = new Map()
  /** @type {Map<string, string>} username → uuid */
  const userByUsername = new Map()
  /** @type {Map<number, string>} */
  const userByOldId = new Map()
  /** @type {Map<string, string>} smKode → uuid */
  const suratMasukByKode = new Map()
  /** @type {Map<string, string>} skKode → uuid */
  const suratKeluarByKode = new Map()

  // --- Host instansi BROS ---
  log('Importing host instansi BROS...')
  let [host] = await db
    .insert(schema.instansi)
    .values({
      kode: uniqueKode('BROS', usedKode),
      nama: 'RSU Bali Royal Hospital',
      alamat: 'Denpasar, Bali',
      kontak: null,
      status: 'aktif',
    })
    .onConflictDoNothing()
    .returning()

  if (!host) {
    host = await db.query.instansi.findFirst({
      where: (t, { eq }) => eq(t.kode, 'BROS'),
    })
  }
  if (!host) throw new Error('Gagal membuat instansi BROS')
  usedKode.add(host.kode)
  instansiByKode.set('BROS', host.id)

  // --- External instansi ---
  log('Importing instansi...')
  const instansiRows = []
  for (const row of legacy.instansi) {
    if (isDeleted(row.instansiDeletedDate)) continue
    const kode = uniqueKode(row.instansiKode, usedKode)
    const telepon = [row.instansiNomorTlp, row.instansiEmail].filter(Boolean).join(' / ') || null
    instansiRows.push({
      legacyKode: String(row.instansiKode || '').trim(),
      values: {
        kode,
        nama: String(row.instansiNama || kode).slice(0, 255),
        alamat: row.instansiAlamat ? String(row.instansiAlamat) : null,
        kontak: telepon ? telepon.slice(0, 100) : null,
        status: 'aktif',
        createdAt: toDate(row.instansiCreatedDate) || new Date(),
        updatedAt: toDate(row.instansiUpdatedDate) || new Date(),
      },
    })
  }

  for (const batch of chunk(instansiRows, 200)) {
    const inserted = await db
      .insert(schema.instansi)
      .values(batch.map((b) => b.values))
      .returning()
    inserted.forEach((row, i) => {
      const legacyKode = batch[i].legacyKode
      if (legacyKode && !instansiByKode.has(legacyKode)) {
        instansiByKode.set(legacyKode, row.id)
      }
      // also map by generated kode
      instansiByKode.set(row.kode, row.id)
    })
  }
  log(`  instansi aktif: ${instansiByKode.size}`)

  // --- Units (under BROS) ---
  log('Importing unit...')
  const unitRows = legacy.unit.filter((u) => !isDeleted(u.unitDeletedDate))
  const usedUnitKode = new Set()

  for (const batch of chunk(unitRows, 100)) {
    const payload = batch.map((u) => {
      const base = String(u.unitNama || `UNIT-${u.unitID}`)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .slice(0, 12) || `U${u.unitID}`
      let kode = base.slice(0, 20)
      let n = 2
      while (usedUnitKode.has(kode)) {
        kode = `${base.slice(0, 16)}${n}`.slice(0, 20)
        n++
      }
      usedUnitKode.add(kode)
      return {
        oldId: Number(u.unitID),
        values: {
          instansiId: host.id,
          kode,
          nama: String(u.unitNama || kode).slice(0, 255),
          status: 'aktif',
          createdAt: toDate(u.unitCreatedDate) || new Date(),
          updatedAt: toDate(u.unitUpdatedDate) || new Date(),
        },
      }
    })

    const inserted = await db
      .insert(schema.unit)
      .values(payload.map((p) => p.values))
      .returning()

    inserted.forEach((row, i) => {
      unitByOldId.set(payload[i].oldId, row.id)
    })
  }
  log(`  unit: ${unitByOldId.size}`)

  const defaultUnitId = unitByOldId.get(1) || [...unitByOldId.values()][0]
  if (!defaultUnitId) throw new Error('Tidak ada unit')

  // --- Users ---
  log('Importing users...')
  const userRows = legacy.user.filter((u) => !isDeleted(u.deletedDate))
  for (const batch of chunk(userRows, 50)) {
    const payload = batch.map((u) => {
      const username = String(u.username || `user${u.id}`).toLowerCase()
      return {
        oldId: Number(u.id),
        username,
        values: {
          nama: String(u.display_name || username).slice(0, 255),
          email: `${username}@bros.local`,
          // PHP bcrypt $2y$ → bcryptjs-compatible $2a$
          password: String(u.password).replace(/^\$2y\$/, '$2a$'),
          level: LEVEL_MAP[Number(u.level)] || 4,
          unitId: unitByOldId.get(Number(u.unitID)) || defaultUnitId,
          jabatan: String(u.display_name || '').slice(0, 100) || null,
          isActive: Number(u.status) !== 0,
          createdAt: toDate(u.createdDate) || new Date(),
          updatedAt: toDate(u.updatedDate) || new Date(),
        },
      }
    })

    const inserted = await db
      .insert(schema.users)
      .values(payload.map((p) => p.values))
      .onConflictDoNothing()
      .returning()

    // if conflict, fetch by email
    for (const p of payload) {
      let id = inserted.find((r) => r.email === p.values.email)?.id
      if (!id) {
        const existing = await db.query.users.findFirst({
          where: (t, { eq }) => eq(t.email, p.values.email),
        })
        id = existing?.id
      }
      if (id) {
        userByUsername.set(p.username, id)
        userByOldId.set(p.oldId, id)
      }
    }
  }
  log(`  users: ${userByUsername.size}`)

  const adminUserId = userByUsername.get('admin') || [...userByUsername.values()][0]
  if (!adminUserId) throw new Error('Tidak ada user admin')

  // --- Surat masuk ---
  log('Importing surat masuk...')
  const smRows = legacy.suratMasuk
  let smCount = 0
  for (const batch of chunk(smRows, 100)) {
    const payload = []
    for (const row of batch) {
      const smKode = String(row.smKode || '')
      const tanggalSurat = toDateOnly(row.smTanggalSurat) || toDateOnly(row.smTanggalTerima) || '2020-01-01'
      const tanggalDiterima = toDateOnly(row.smTanggalTerima) || tanggalSurat
      const pengirimKode = String(row.kodePengirim || '').trim()
      const asalId = instansiByKode.get(pengirimKode) || null

      const catatan = [
        row.smTujuan ? `Tujuan: ${row.smTujuan}` : null,
        row.smDisposisiDirut ? `Disposisi Dirut: ${row.smDisposisiDirut}` : null,
        smKode ? `Legacy: ${smKode}` : null,
      ]
        .filter(Boolean)
        .join('\n')

      payload.push({
        smKode,
        values: {
          nomorSurat: String(row.smNomorSurat || smKode || '-').slice(0, 100),
          perihal: String(row.smPerihal || '(tanpa perihal)').slice(0, 255),
          isiRingkasan: row.smKeterangan ? String(row.smKeterangan) : null,
          asalInstansiId: asalId,
          pengirim: pengirimKode || null,
          tanggalSurat,
          tanggalDiterima,
          tujuanUnitId: defaultUnitId,
          klasifikasiId: klasifikasiDefault?.id || null,
          status: mapSuratMasukStatus(row),
          catatanInternal: catatan || null,
          createdBy: adminUserId,
          createdAt: toDate(row.smCreatedDate) || new Date(),
          updatedAt: toDate(row.smUpdatedDate) || new Date(),
          deletedAt: toDate(row.smDeletedDate),
        },
      })
    }

    const inserted = await db
      .insert(schema.suratMasuk)
      .values(payload.map((p) => p.values))
      .returning()

    inserted.forEach((row, i) => {
      if (payload[i].smKode) suratMasukByKode.set(payload[i].smKode, row.id)
    })
    smCount += inserted.length
  }
  log(`  surat masuk: ${smCount}`)

  // --- Surat keluar ---
  log('Importing surat keluar...')
  let skCount = 0
  for (const batch of chunk(legacy.suratKeluar, 100)) {
    const payload = []
    for (const row of batch) {
      const skKode = String(row.skKode || '')
      const penerimaKode = String(row.kodePenerima || '').trim()
      const tujuanId = instansiByKode.get(penerimaKode) || null
      const tanggal = toDateOnly(row.skTanggalKeluar)

      payload.push({
        skKode,
        values: {
          nomorSurat: row.skNomorSurat ? String(row.skNomorSurat).slice(0, 100) : skKode,
          perihal: String(row.skPerihal || '(tanpa perihal)').slice(0, 255),
          isiSurat: row.skKeterangan ? String(row.skKeterangan) : null,
          tujuanInstansiId: tujuanId,
          penerima: row.skTujuan ? String(row.skTujuan).slice(0, 255) : null,
          tanggalSurat: tanggal,
          unitId: defaultUnitId,
          klasifikasiId: klasifikasiDefault?.id || null,
          status: mapSuratKeluarStatus(row),
          catatanInternal: skKode ? `Legacy: ${skKode}` : null,
          createdBy: adminUserId,
          createdAt: toDate(row.skCreatedDate) || new Date(),
          updatedAt: toDate(row.skUpdatedDate) || new Date(),
          deletedAt: toDate(row.skDeletedDate),
        },
      })
    }

    const inserted = await db
      .insert(schema.suratKeluar)
      .values(payload.map((p) => p.values))
      .returning()

    inserted.forEach((row, i) => {
      if (payload[i].skKode) suratKeluarByKode.set(payload[i].skKode, row.id)
    })
    skCount += inserted.length
  }
  log(`  surat keluar: ${skCount}`)

  // --- Disposisi ---
  log('Importing disposisi...')
  const dspByKode = new Map(legacy.disposisi.map((d) => [String(d.dspKode), d]))
  const disposisiPayload = []

  for (const du of legacy.disposisiUnit) {
    const dsp = dspByKode.get(String(du.dspKode))
    if (!dsp || isDeleted(dsp.dspDeletedDate)) continue
    const suratId = suratMasukByKode.get(String(dsp.smKode))
    if (!suratId) continue

    const keUnitId = unitByOldId.get(Number(du.unitID)) || null
    const dariUserId = userByUsername.get(String(du.userResponder || '').toLowerCase())
      || adminUserId

    disposisiPayload.push({
      suratId,
      dariUserId,
      keUnitId,
      instruksi: [
        dsp.dspCatatan ? String(dsp.dspCatatan) : null,
        du.catatanKonfirmasi ? `Konfirmasi: ${du.catatanKonfirmasi}` : null,
      ]
        .filter(Boolean)
        .join('\n') || null,
      batasWaktu: toDateOnly(dsp.dspTanggalMinimalRespon),
      status: mapDisposisiStatus(dsp, du),
      createdAt: toDate(dsp.dspCreatedDate) || toDate(dsp.dspTanggalDisposisi) || new Date(),
      updatedAt: toDate(dsp.dspUpdatedDate) || new Date(),
    })
  }

  // disposisi tanpa unit mapping
  for (const dsp of legacy.disposisi) {
    if (isDeleted(dsp.dspDeletedDate)) continue
    const hasUnit = legacy.disposisiUnit.some((d) => String(d.dspKode) === String(dsp.dspKode))
    if (hasUnit) continue
    const suratId = suratMasukByKode.get(String(dsp.smKode))
    if (!suratId) continue
    disposisiPayload.push({
      suratId,
      dariUserId: adminUserId,
      keUnitId: defaultUnitId,
      instruksi: dsp.dspCatatan ? String(dsp.dspCatatan) : null,
      batasWaktu: toDateOnly(dsp.dspTanggalMinimalRespon),
      status: Number(dsp.dspStatus) === 1 ? 'selesai' : 'diterima',
      createdAt: toDate(dsp.dspCreatedDate) || new Date(),
      updatedAt: toDate(dsp.dspUpdatedDate) || new Date(),
    })
  }

  let dspCount = 0
  for (const batch of chunk(disposisiPayload, 200)) {
    const inserted = await db.insert(schema.disposisi).values(batch).returning()
    dspCount += inserted.length
  }
  log(`  disposisi: ${dspCount}`)

  // --- Lampiran + MinIO ---
  log('Importing lampiran...')
  let minio = null
  if (!SKIP_FILES) {
    try {
      minio = await ensureMinio()
      log('  MinIO connected')
    }
    catch (e) {
      log(`  MinIO unavailable (${e.message}) — metadata only`)
    }
  }

  const localFiles = new Set(
    existsSync(UPLOADS)
      ? readdirSync(UPLOADS).filter((f) => f !== '.gitkeep')
      : [],
  )

  let fileOk = 0
  let fileMissing = 0
  let fileUploaded = 0

  for (const batch of chunk(legacy.file, 50)) {
    const payload = []
    for (const f of batch) {
      const ref = String(f.refKode || '')
      const isMasuk = ref.startsWith('SM-')
      const isKeluar = ref.startsWith('SK-')
      if (!isMasuk && !isKeluar) continue

      const suratId = isMasuk ? suratMasukByKode.get(ref) : suratKeluarByKode.get(ref)
      if (!suratId) continue

      const fileName = basenameFromLegacyPath(f.fileDirectory) || String(f.fileName || 'file')
      const localPath = join(UPLOADS, fileName)
      const objectPath = `BROS/legacy/${fileName}`
      const hasLocal = localFiles.has(fileName)

      if (hasLocal && minio) {
        try {
          const st = statSync(localPath)
          await minio.fPutObject(MINIO.bucket, objectPath, localPath, {
            'Content-Type': String(f.fileType || 'application/octet-stream'),
          })
          fileUploaded++
          payload.push({
            suratId,
            jenis: isMasuk ? 'masuk' : 'keluar',
            namaFile: String(f.fileName || fileName).slice(0, 255),
            path: objectPath,
            mimeType: String(f.fileType || 'application/octet-stream').slice(0, 100),
            size: Number(f.fileSize) || st.size || 0,
            uploadedBy: userByUsername.get(String(f.fileUploadedBy || '').toLowerCase()) || adminUserId,
            createdAt: toDate(f.fileCreatedDate) || new Date(),
          })
          fileOk++
          continue
        }
        catch (e) {
          log(`  upload fail ${fileName}: ${e.message}`)
        }
      }

      if (!hasLocal) fileMissing++

      // metadata only (path points to legacy relative path for later sync)
      payload.push({
        suratId,
        jenis: isMasuk ? 'masuk' : 'keluar',
        namaFile: String(f.fileName || fileName).slice(0, 255),
        path: hasLocal ? objectPath : `legacy-missing/${fileName}`,
        mimeType: String(f.fileType || 'application/octet-stream').slice(0, 100),
        size: Number(f.fileSize) || 0,
        uploadedBy: userByUsername.get(String(f.fileUploadedBy || '').toLowerCase()) || adminUserId,
        createdAt: toDate(f.fileCreatedDate) || new Date(),
      })
      fileOk++
    }

    if (payload.length) {
      await db.insert(schema.lampiran).values(payload)
    }
  }

  log(`  lampiran records: ${fileOk}`)
  log(`  uploaded to MinIO: ${fileUploaded}`)
  log(`  missing local files: ${fileMissing}`)

  await client.end()

  log('Done.')
  log('Login legacy users: <username>@bros.local + password lama')
  log('Contoh: admin@bros.local (password sama seperti sistem lama)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
