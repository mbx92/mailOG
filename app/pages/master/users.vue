<script setup>
import { toast } from 'vue-sonner'
import { Plus } from '@lucide/vue'

const LEVEL_OPTIONS = [
  { value: 1, label: 'Super Admin' },
  { value: 2, label: 'Direksi' },
  { value: 3, label: 'Admin / Sekretaris' },
  { value: 4, label: 'Staff Unit' },
  { value: 5, label: 'Viewer' },
]

const { can } = useRBAC()
if (!can('manage_user')) {
  await navigateTo('/')
}

const q = ref('')
const showForm = ref(false)
const loading = ref(false)
const editingId = ref(null)
const editingProvider = ref('local')

const form = reactive({
  nama: '',
  email: '',
  password: '',
  level: 4,
  unitId: '',
  jabatan: '',
  isActive: true,
})

const [{ data, refresh, pending }, { data: unitData }] = await Promise.all([
  useFetch('/api/users', {
    query: computed(() => ({ q: q.value || undefined })),
    watch: [q],
  }),
  useFetch('/api/unit'),
])

function resetForm() {
  editingId.value = null
  editingProvider.value = 'local'
  Object.assign(form, {
    nama: '',
    email: '',
    password: '',
    level: 4,
    unitId: '',
    jabatan: '',
    isActive: true,
  })
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(row) {
  editingId.value = row.id
  editingProvider.value = row.provider || 'local'
  Object.assign(form, {
    nama: row.nama || '',
    email: row.email || '',
    password: '',
    level: row.level,
    unitId: row.unitId || '',
    jabatan: row.jabatan || '',
    isActive: row.isActive !== false,
  })
  showForm.value = true
}

async function saveUser() {
  loading.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/users/${editingId.value}`, {
        method: 'PUT',
        body: {
          nama: form.nama,
          level: form.level,
          unitId: form.unitId || null,
          jabatan: form.jabatan || null,
          isActive: form.isActive,
        },
      })
      toast.success('User diperbarui')
    }
    else {
      await $fetch('/api/users', {
        method: 'POST',
        body: {
          nama: form.nama,
          email: form.email,
          password: form.password,
          level: form.level,
          unitId: form.unitId || null,
          jabatan: form.jabatan || null,
        },
      })
      toast.success('User ditambahkan')
    }
    showForm.value = false
    resetForm()
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal menyimpan')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 class="text-display-md text-ink tracking-tight">
          Users
        </h1>
        <p class="text-body-sm text-steel mt-1">
          Manajemen pengguna & level akses
        </p>
      </div>
      <UiButton @click="openCreate">
        <Plus class="w-4 h-4" />
        Tambah User
      </UiButton>
    </div>

    <div class="max-w-sm">
      <UiSearchPill v-model="q" placeholder="Cari user..." />
    </div>

    <div class="card-base !p-0 overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-surface">
          <tr>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Nama
            </th>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Email
            </th>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Level
            </th>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Unit
            </th>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Provider
            </th>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Status
            </th>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="7" class="px-4 py-8 text-center text-body-sm text-steel">
              Memuat...
            </td>
          </tr>
          <tr
            v-for="row in data?.data || []"
            :key="row.id"
            class="border-t border-hairline-soft"
          >
            <td class="px-4 py-3 text-body-sm font-medium text-ink">
              {{ row.nama }}
            </td>
            <td class="px-4 py-3 text-body-sm text-steel">
              {{ row.email }}
            </td>
            <td class="px-4 py-3 text-body-sm text-charcoal">
              {{ row.levelLabel }}
            </td>
            <td class="px-4 py-3 text-body-sm text-steel">
              {{ row.unit?.nama || '—' }}
            </td>
            <td class="px-4 py-3">
              <span :class="row.provider === 'sso' ? 'badge-beta' : 'badge-muted'">
                {{ row.providerLabel || row.provider }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span :class="row.isActive ? 'badge-success' : 'badge-muted'">
                {{ row.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <button
                type="button"
                class="text-body-sm text-ink font-medium"
                @click="openEdit(row)"
              >
                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiSlidePanel
      :open="showForm"
      :title="editingId ? 'Edit User' : 'Tambah User'"
      @close="showForm = false"
    >
      <form class="space-y-4" @submit.prevent="saveUser">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Nama</label>
          <input v-model="form.nama" required class="input-field">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Email</label>
          <input
            v-model="form.email"
            type="email"
            required
            class="input-field"
            :disabled="!!editingId"
          >
          <p v-if="editingId" class="text-caption text-muted mt-1.5">
            Email tidak dapat diubah
          </p>
        </div>
        <div v-if="!editingId">
          <label class="block text-caption-bold text-steel mb-1.5">Password</label>
          <input v-model="form.password" type="password" required minlength="8" class="input-field">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Role / Level</label>
          <select v-model.number="form.level" class="input-field">
            <option v-for="opt in LEVEL_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Unit</label>
          <select v-model="form.unitId" class="input-field">
            <option value="">
              — opsional —
            </option>
            <option v-for="u in unitData?.data || []" :key="u.id" :value="u.id">
              {{ u.nama }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Jabatan</label>
          <input v-model="form.jabatan" class="input-field">
        </div>
        <div v-if="editingId" class="flex items-center gap-2">
          <input
            id="user-active"
            v-model="form.isActive"
            type="checkbox"
            class="rounded border-hairline"
          >
          <label for="user-active" class="text-body-sm text-ink">Aktif</label>
        </div>
        <p v-if="editingId && editingProvider === 'sso'" class="text-caption text-muted">
          User SSO — password dikelola di portal SSO
        </p>
      </form>
      <template #footer>
        <UiButton variant="tertiary" @click="showForm = false">
          Batal
        </UiButton>
        <UiButton :disabled="loading" @click="saveUser">
          {{ loading ? 'Menyimpan...' : 'Simpan' }}
        </UiButton>
      </template>
    </UiSlidePanel>
  </div>
</template>
