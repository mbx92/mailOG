<script setup >
import { toast } from 'vue-sonner'
import { Plus } from '@lucide/vue'

const { can } = useRBAC()
const q = ref('')
const showForm = ref(false)
const loading = ref(false)

const form = reactive({
  kode: '',
  nama: '',
  alamat: '',
  kontak: '',
  status: 'aktif',
})

const { data, refresh, pending } = await useFetch('/api/instansi', {
  query: computed(() => ({ q: q.value || undefined })),
  watch: [q],
})

async function createInstansi() {
  loading.value = true
  try {
    await $fetch('/api/instansi', { method: 'POST', body: { ...form } })
    toast.success('Instansi ditambahkan')
    showForm.value = false
    form.kode = ''
    form.nama = ''
    form.alamat = ''
    form.kontak = ''
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal menyimpan')
  }
  finally {
    loading.value = false
  }
}

async function softDelete(id) {
  if (!confirm('Nonaktifkan instansi ini?')) return
  try {
    await $fetch(`/api/instansi/${id}`, { method: 'DELETE' })
    toast.success('Instansi dinonaktifkan')
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
          Instansi
        </h1>
        <p class="text-body-sm text-steel mt-1">
          Master data instansi pengirim & penerima
        </p>
      </div>
      <UiButton v-if="can('manage_instansi')" @click="showForm = true">
        <Plus class="w-4 h-4" />
        Tambah Instansi
      </UiButton>
    </div>

    <div class="max-w-sm">
      <UiSearchPill v-model="q" placeholder="Cari instansi..." />
    </div>

    <div class="card-base !p-0 overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-surface">
          <tr>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Kode
            </th>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Nama
            </th>
            <th class="px-4 py-3 text-caption-bold text-steel">
              Kontak
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
            <td colspan="5" class="px-4 py-8 text-center text-body-sm text-steel">
              Memuat...
            </td>
          </tr>
          <tr
            v-for="row in data?.data || []"
            :key="row.id"
            class="border-t border-hairline-soft"
          >
            <td class="px-4 py-3 text-body-sm font-medium text-ink">
              {{ row.kode }}
            </td>
            <td class="px-4 py-3 text-body-sm text-charcoal">
              {{ row.nama }}
            </td>
            <td class="px-4 py-3 text-body-sm text-steel">
              {{ row.kontak || '—' }}
            </td>
            <td class="px-4 py-3">
              <span :class="row.status === 'aktif' ? 'badge-success' : 'badge-muted'">
                {{ row.status }}
              </span>
            </td>
            <td class="px-4 py-3">
              <button
                v-if="can('manage_instansi')"
                type="button"
                class="text-body-sm text-error font-medium"
                @click="softDelete(row.id)"
              >
                Hapus
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiSlidePanel :open="showForm" title="Tambah Instansi" @close="showForm = false">
      <form class="space-y-4" @submit.prevent="createInstansi">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Kode</label>
          <input v-model="form.kode" required class="input-field" maxlength="20">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Nama</label>
          <input v-model="form.nama" required class="input-field">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Alamat</label>
          <textarea v-model="form.alamat" rows="2" class="input-field h-auto py-2.5" />
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Kontak</label>
          <input v-model="form.kontak" class="input-field">
        </div>
      </form>
      <template #footer>
        <UiButton variant="tertiary" @click="showForm = false">
          Batal
        </UiButton>
        <UiButton :disabled="loading" @click="createInstansi">
          Simpan
        </UiButton>
      </template>
    </UiSlidePanel>
  </div>
</template>
