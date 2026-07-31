<script setup>
import { toast } from 'vue-sonner'
import { Plus } from '@lucide/vue'

const { can } = useRBAC()
const canManage = computed(() => can('manage_instansi'))

const q = ref('')
const showForm = ref(false)
const loading = ref(false)
const editingId = ref(null)

const form = reactive({
  nama: '',
  warna: '#5f5f5f',
  urutan: 0,
})

const { data, refresh, pending } = await useFetch('/api/klasifikasi', {
  query: computed(() => ({ q: q.value || undefined })),
  watch: [q],
})

const filtered = computed(() => {
  const rows = data.value?.data || []
  const term = q.value.trim().toLowerCase()
  if (!term) return rows
  return rows.filter(r => r.nama.toLowerCase().includes(term))
})

function openCreate() {
  editingId.value = null
  form.nama = ''
  form.warna = '#5f5f5f'
  form.urutan = (data.value?.data?.length || 0) + 1
  showForm.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.nama = row.nama
  form.warna = row.warna || '#5f5f5f'
  form.urutan = row.urutan ?? 0
  showForm.value = true
}

async function save() {
  if (!form.nama.trim()) {
    toast.error('Nama wajib diisi')
    return
  }
  loading.value = true
  try {
    const body = {
      nama: form.nama.trim(),
      warna: form.warna,
      urutan: Number(form.urutan) || 0,
    }
    if (editingId.value) {
      await $fetch(`/api/klasifikasi/${editingId.value}`, { method: 'PUT', body })
      toast.success('Klasifikasi diperbarui')
    }
    else {
      await $fetch('/api/klasifikasi', { method: 'POST', body })
      toast.success('Klasifikasi ditambahkan')
    }
    showForm.value = false
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal menyimpan')
  }
  finally {
    loading.value = false
  }
}

async function remove(row) {
  if (!confirm(`Hapus klasifikasi "${row.nama}"?`)) return
  try {
    await $fetch(`/api/klasifikasi/${row.id}`, { method: 'DELETE' })
    toast.success('Klasifikasi dihapus')
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal menghapus')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 class="text-display-md text-ink tracking-tight">
          Klasifikasi
        </h1>
        <p class="text-body-sm text-steel mt-1">
          Tingkat urgensi & klasifikasi surat
        </p>
      </div>
      <UiButton v-if="canManage" @click="openCreate">
        <Plus class="w-4 h-4" />
        Tambah Klasifikasi
      </UiButton>
    </div>

    <div class="max-w-sm">
      <UiSearchPill v-model="q" placeholder="Cari klasifikasi..." />
    </div>

    <div class="card-base !p-0 overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-surface">
          <tr>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Warna
            </th>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Nama
            </th>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Urutan
            </th>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="4" class="px-4 py-8 text-center text-body-sm text-steel">
              Memuat...
            </td>
          </tr>
          <tr v-else-if="!filtered.length">
            <td colspan="4" class="px-4 py-8 text-center text-body-sm text-steel">
              Belum ada klasifikasi
            </td>
          </tr>
          <tr
            v-for="row in filtered"
            :key="row.id"
            class="border-t border-hairline-soft"
          >
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center gap-2 text-body-sm text-steel"
              >
                <span
                  class="inline-block w-4 h-4 rounded-full border border-hairline-soft"
                  :style="{ backgroundColor: row.warna }"
                />
                <span class="font-mono text-caption">{{ row.warna }}</span>
              </span>
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-block px-2.5 py-1 rounded-md text-body-sm font-medium"
                :style="{ backgroundColor: row.warna + '22', color: row.warna }"
              >
                {{ row.nama }}
              </span>
            </td>
            <td class="px-4 py-3 text-body-sm text-steel">
              {{ row.urutan }}
            </td>
            <td class="px-4 py-3">
              <div v-if="canManage" class="flex gap-3">
                <button
                  type="button"
                  class="text-body-sm text-ink font-medium"
                  @click="openEdit(row)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="text-body-sm text-error font-medium"
                  @click="remove(row)"
                >
                  Hapus
                </button>
              </div>
              <span v-else class="text-body-sm text-muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiSlidePanel
      :open="showForm"
      :title="editingId ? 'Edit Klasifikasi' : 'Tambah Klasifikasi'"
      @close="showForm = false"
    >
      <form class="space-y-4" @submit.prevent="save">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Nama</label>
          <input v-model="form.nama" required class="input-field" maxlength="100" placeholder="Contoh: Segera">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Warna badge</label>
          <div class="flex gap-2 items-center">
            <input v-model="form.warna" type="color" class="w-11 h-11 rounded-lg border border-hairline-soft cursor-pointer bg-transparent p-1">
            <input v-model="form.warna" class="input-field font-mono" maxlength="7" placeholder="#5f5f5f">
          </div>
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Urutan</label>
          <input v-model.number="form.urutan" type="number" min="0" class="input-field" >
          <p class="text-caption text-muted mt-1.5">
            Angka lebih kecil tampil lebih dulu
          </p>
        </div>
        <div class="rounded-lg bg-surface border border-hairline-soft px-4 py-3">
          <p class="text-caption text-muted mb-2">
            Preview
          </p>
          <span
            class="inline-block px-2.5 py-1 rounded-md text-body-sm font-medium"
            :style="{ backgroundColor: form.warna + '22', color: form.warna }"
          >
            {{ form.nama || 'Nama klasifikasi' }}
          </span>
        </div>
      </form>
      <template #footer>
        <UiButton variant="tertiary" @click="showForm = false">
          Batal
        </UiButton>
        <UiButton :disabled="loading" @click="save">
          {{ loading ? 'Menyimpan...' : 'Simpan' }}
        </UiButton>
      </template>
    </UiSlidePanel>
  </div>
</template>
