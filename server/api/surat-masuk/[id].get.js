import { and, desc, eq, isNull } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { useDb } from '../../db/index.js'
import { suratMasuk, lampiran, disposisi, unit, users } from '../../db/schema/index.js'
import { requireAuthUser } from '../../utils/rbac.js'
import { writeAuditLog } from '../../utils/audit.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID wajib' })

  const db = useDb()
  const row = await db.query.suratMasuk.findFirst({
    where: and(eq(suratMasuk.id, id), isNull(suratMasuk.deletedAt)),
    with: {
      asalInstansi: true,
      tujuanUnit: true,
      klasifikasi: true,
      creator: { columns: { id: true, nama: true, email: true } },
    },
  })

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Surat tidak ditemukan' })

  const dariUser = alias(users, 'dari_user')
  const keUser = alias(users, 'ke_user')

  const [files, disposisiList] = await Promise.all([
    db.query.lampiran.findMany({
      where: and(eq(lampiran.suratId, id), eq(lampiran.jenis, 'masuk')),
    }),
    db
      .select({
        id: disposisi.id,
        suratId: disposisi.suratId,
        dariUserId: disposisi.dariUserId,
        keUserId: disposisi.keUserId,
        keUnitId: disposisi.keUnitId,
        instruksi: disposisi.instruksi,
        batasWaktu: disposisi.batasWaktu,
        status: disposisi.status,
        parentId: disposisi.parentId,
        createdAt: disposisi.createdAt,
        updatedAt: disposisi.updatedAt,
        keUnitNama: unit.nama,
        keUnitKode: unit.kode,
        dariUserNama: dariUser.nama,
        keUserNama: keUser.nama,
      })
      .from(disposisi)
      .leftJoin(unit, eq(disposisi.keUnitId, unit.id))
      .leftJoin(dariUser, eq(disposisi.dariUserId, dariUser.id))
      .leftJoin(keUser, eq(disposisi.keUserId, keUser.id))
      .where(eq(disposisi.suratId, id))
      .orderBy(desc(disposisi.createdAt)),
  ])

  await writeAuditLog({
    user,
    suratId: id,
    aksi: 'baca',
    event,
  })

  return {
    data: {
      ...row,
      lampiran: files,
      disposisi: disposisiList,
    },
  }
})
