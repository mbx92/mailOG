import { mkdir, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { requireAuthUser, requirePermission } from '../../../utils/rbac.js'
import { writeAuditLog } from '../../../utils/audit.js'

const ROOT = fileURLToPath(new URL('../../../..', import.meta.url))
const BACKUP_DIR = join(ROOT, 'backups')

function parseDatabaseUrl(url) {
  const u = new URL(url)
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  }
}

async function runPgDump(outFile) {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL tidak dikonfigurasi')
  const cfg = parseDatabaseUrl(url)

  return new Promise((resolvePromise, reject) => {
    const args = [
      '-h', cfg.host,
      '-p', String(cfg.port),
      '-U', cfg.user,
      '-d', cfg.database,
      '-F', 'c',
      '-f', outFile,
    ]
    const child = spawn('pg_dump', args, {
      env: { ...process.env, PGPASSWORD: cfg.password },
      windowsHide: true,
    })
    let err = ''
    child.stderr.on('data', (d) => { err += d.toString() })
    child.on('error', (e) => reject(e))
    child.on('close', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(err || `pg_dump exit ${code}`))
    })
  })
}

async function runSqlFallback(outFile) {
  const postgres = (await import('postgres')).default
  const sql = postgres(process.env.DATABASE_URL, { max: 1 })
  try {
    const tables = await sql`
      select tablename from pg_tables where schemaname = 'public' order by tablename
    `
    const lines = [
      '-- MailOG SQL backup (fallback)',
      `-- created_at: ${new Date().toISOString()}`,
      'BEGIN;',
      '',
    ]
    for (const t of tables) {
      const name = t.tablename
      lines.push(`-- table: ${name}`)
      const rows = await sql.unsafe(`select * from "${name}"`)
      if (!rows.length) {
        lines.push('-- (empty)', '')
        continue
      }
      const cols = Object.keys(rows[0])
      for (const row of rows) {
        const vals = cols.map((c) => {
          const v = row[c]
          if (v == null) return 'NULL'
          if (v instanceof Date) return `'${v.toISOString().replace(/'/g, "''")}'`
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`
          if (typeof v === 'number' || typeof v === 'boolean') return String(v)
          return `'${String(v).replace(/'/g, "''")}'`
        })
        lines.push(
          `INSERT INTO "${name}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});`,
        )
      }
      lines.push('')
    }
    lines.push('COMMIT;')
    await writeFile(outFile, lines.join('\n'), 'utf8')
  }
  finally {
    await sql.end()
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  requirePermission(user, 'pengaturan')

  await mkdir(BACKUP_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  let filename = `mailog-${stamp}.dump`
  let outFile = join(BACKUP_DIR, filename)
  let mode = 'pg_dump'

  try {
    await runPgDump(outFile)
  }
  catch {
    mode = 'sql-fallback'
    filename = `mailog-${stamp}.sql`
    outFile = join(BACKUP_DIR, filename)
    await runSqlFallback(outFile)
  }

  const st = await stat(outFile)

  await writeAuditLog({
    user,
    aksi: 'export',
    detail: { entity: 'backup', filename, mode, size: st.size },
    event,
  })

  return {
    data: {
      filename,
      mode,
      size: st.size,
      createdAt: st.mtime.toISOString(),
      downloadUrl: `/api/pengaturan/backup/${encodeURIComponent(filename)}`,
    },
  }
})
