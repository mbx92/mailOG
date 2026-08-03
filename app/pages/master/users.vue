<script setup >
import { toast } from 'vue-sonner'
import { Plus } from '@lucide/vue'

const { can } = useRBAC()
if (!can('manage_user')) {
  await navigateTo('/')
}

const q = ref('')
const showForm = ref(false)
const loading = ref(false)

const form = reactive({
  nama: '',
  email: '',
  password: '',
  level: 4,
  unitId: '',
  jabatan: '',
})

const [{ data, refresh, pending }, { data: unitData }] = await Promise.all([
  useFetch('/api/users', {
    query: computed(() => ({ q: q.value || undefined })),
    watch: [q],
  }),
  useFetch('/api/unit'),
])

async function createUser() {
  loading.value = true
  try {
    await $fetch('/api/users', {
      method: 'POST',
      body: {
        ...form,
        unitId: form.unitId || null,
      },
    })
    toast.success('User ditambahkan')
    showForm.value = false
    Object.assign(form, { nama: '', email: '', password: '', level: 4, unitId: '', jabatan: '' })
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
      <UiButton @click="showForm = true">
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
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="6" class="px-4 py-8 text-center text-body-sm text-steel">
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
          </tr>
        </tbody>
      </table>
    </div>

    <UiSlidePanel :open="showForm" title="Tambah User" @close="showForm = false">
      <form class="space-y-4" @submit.prevent="createUser">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Nama</label>
          <input v-model="form.nama" required class="input-field">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Email</label>
          <input v-model="form.email" type="email" required class="input-field">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Password</label>
          <input v-model="form.password" type="password" required minlength="8" class="input-field">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Level</label>
          <select v-model.number="form.level" class="input-field">
            <option :value="1">
              Super Admin
            </option>
            <option :value="2">
              Direksi
            </option>
            <option :value="3">
              Admin / Sekretaris
            </option>
            <option :value="4">
              Staff Unit
            </option>
            <option :value="5">
              Viewer
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
      </form>
      <template #footer>
        <UiButton variant="tertiary" @click="showForm = false">
          Batal
        </UiButton>
        <UiButton :disabled="loading" @click="createUser">
          Simpan
        </UiButton>
      </template>
    </UiSlidePanel>
  </div>
</template>
