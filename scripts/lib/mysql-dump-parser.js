/**
 * Parse MySQL dump INSERT statements into row objects.
 * Supports multi-row VALUES and escaped quotes.
 */

/**
 * @param {string} sql
 * @param {string} table
 * @returns {Record<string, unknown>[]}
 */
export function parseInserts(sql, table) {
  const rows = []
  const re = new RegExp(
    String.raw`insert\s+into\s+\`${table}\`\s*\(([^)]+)\)\s*values\s*`,
    'gi',
  )

  let match
  while ((match = re.exec(sql)) !== null) {
    const columns = match[1]
      .split(',')
      .map((c) => c.trim().replace(/`/g, ''))

    const valuesStart = match.index + match[0].length
    const { tuples, end } = readValueTuples(sql, valuesStart)
    for (const values of tuples) {
      if (values.length !== columns.length) continue
      const row = {}
      columns.forEach((col, i) => {
        row[col] = values[i]
      })
      rows.push(row)
    }
    re.lastIndex = end
  }

  return rows
}

/**
 * @param {string} sql
 * @param {number} start
 */
function readValueTuples(sql, start) {
  const tuples = []
  let i = start
  const len = sql.length

  while (i < len) {
    while (i < len && /\s/.test(sql[i])) i++
    if (i >= len) break

    if (sql[i] === ';') {
      i++
      break
    }

    // next insert / create / drop / comment
    if (sql[i] !== '(') break

    const { values, end } = parseTuple(sql, i)
    tuples.push(values)
    i = end

    while (i < len && /\s/.test(sql[i])) i++
    if (sql[i] === ',') {
      i++
      continue
    }
    if (sql[i] === ';') {
      i++
      break
    }
    break
  }

  return { tuples, end: i }
}

/**
 * @param {string} sql
 * @param {number} start index of '('
 */
function parseTuple(sql, start) {
  const values = []
  let i = start + 1
  const len = sql.length

  while (i < len) {
    while (i < len && /\s/.test(sql[i])) i++

    if (sql[i] === ')') {
      return { values, end: i + 1 }
    }

    if (sql[i] === ',') {
      i++
      continue
    }

    // NULL
    if (sql.slice(i, i + 4).toUpperCase() === 'NULL' && !/[A-Za-z0-9_]/.test(sql[i + 4] || '')) {
      values.push(null)
      i += 4
      continue
    }

    // string
    if (sql[i] === "'" || sql[i] === '"') {
      const quote = sql[i]
      i++
      let out = ''
      while (i < len) {
        const ch = sql[i]
        if (ch === '\\') {
          const next = sql[i + 1]
          if (next === 'n') out += '\n'
          else if (next === 'r') out += '\r'
          else if (next === 't') out += '\t'
          else if (next === '0') out += '\0'
          else if (next === 'Z') out += '\x1a'
          else out += next ?? ''
          i += 2
          continue
        }
        // MySQL escaped quote ''
        if (ch === quote && sql[i + 1] === quote) {
          out += quote
          i += 2
          continue
        }
        if (ch === quote) {
          i++
          break
        }
        out += ch
        i++
      }
      values.push(out)
      continue
    }

    // number / bareword
    let token = ''
    while (i < len && /[^,\s)]/.test(sql[i])) {
      token += sql[i]
      i++
    }
    if (token === '') {
      throw new Error(`Unexpected token at ${i}: ${sql.slice(i, i + 40)}`)
    }
    if (/^-?\d+(\.\d+)?$/.test(token)) {
      values.push(Number(token))
    }
    else {
      values.push(token)
    }
  }

  throw new Error('Unclosed tuple')
}

/**
 * @param {unknown} v
 * @returns {Date | null}
 */
export function toDate(v) {
  if (v == null || v === '') return null
  const s = String(v)
  if (s.startsWith('0000-00-00')) return null
  const d = new Date(s.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return null
  return d
}

/**
 * @param {unknown} v
 * @returns {string | null}
 */
export function toDateOnly(v) {
  const d = toDate(v)
  if (!d) return null
  return d.toISOString().slice(0, 10)
}

/**
 * @param {unknown} v
 */
export function isDeleted(v) {
  return Boolean(toDate(v))
}
