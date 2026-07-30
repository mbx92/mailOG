const MATRIX = {
  manage_user: [1],
  manage_instansi: [1, 3],
  manage_unit: [1, 3],
  buat_surat: [1, 2, 3],
  edit_surat_all: [1, 3],
  hapus_surat: [1],
  approve_surat: [1, 2, 3],
  disposisi: [1, 2, 3],
  registrasi_surat: [1, 2, 3],
  terima_disposisi: [1, 2, 3, 4],
  lihat_all: [1, 2],
  export: [1, 2, 3, 4],
  audit: [1],
  /** Super Admin only ("god") */
  pengaturan: [1],
}

export function useRBAC() {
  const { user } = useUserSession()

  const can = (permission) => {
    const level = user.value?.level
    if (!level) return false
    return MATRIX[permission]?.includes(level) ?? false
  }

  const isSuperAdmin = computed(() => user.value?.level === 1)

  return { can, isSuperAdmin, user }
}
