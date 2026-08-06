import { Client } from 'minio'

const c = new Client({
  endPoint: '10.100.10.100',
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
})

const BUCKET = process.env.MINIO_BUCKET || 'mailog'

const stream = c.listObjects(BUCKET, '', true)
const objects = []
for await (const obj of stream) objects.push(obj)

const rootFiles = objects.filter(o => !o.name.includes('/'))
const legacyFiles = objects.filter(o => o.name.startsWith('BROS/legacy/'))
const legacySet = new Set(legacyFiles.map(o => o.name.split('/').pop()))

const onlyInRoot = rootFiles.filter(o => !legacySet.has(o.name) && o.name !== '.gitkeep')
const dupes = rootFiles.filter(o => legacySet.has(o.name))

console.log('Unique to move:', onlyInRoot.length)
console.log('Duplicates to delete:', dupes.length)

// 1. Copy unique files to BROS/legacy/ then delete from root
let moved = 0
for (const obj of onlyInRoot) {
  try {
    const newPath = 'BROS/legacy/' + obj.name
    // minio copyObject: copy is within same bucket when dest bucket = src bucket
    await c.copyObject(BUCKET, newPath, '/' + BUCKET + '/' + obj.name)
    // verify copy exists
    await c.statObject(BUCKET, newPath)
    // delete original from root
    await c.removeObject(BUCKET, obj.name)
    moved++
    if (moved % 20 === 0) console.log('  moved', moved, '/', onlyInRoot.length)
  }
  catch (e) {
    console.warn('  FAILED move:', obj.name, e.message)
  }
}
console.log('Moved:', moved, '/', onlyInRoot.length)

// 2. Delete duplicates from root
let deleted = 0
for (const obj of dupes) {
  try {
    await c.removeObject(BUCKET, obj.name)
    deleted++
    if (deleted % 200 === 0) console.log('  deleted', deleted, '/', dupes.length)
  }
  catch (e) {
    console.warn('  FAILED delete:', obj.name, e.message)
  }
}
console.log('Deleted dupes:', deleted, '/', dupes.length)

// 3. Final count
const s2 = c.listObjects(BUCKET, '', true)
let total = 0, rootCount = 0
for await (const obj of s2) {
  total++
  if (!obj.name.includes('/')) rootCount++
}
console.log('\nFinal: total=' + total + ', root=' + rootCount)
