<script setup>
import { Plus } from '@lucide/vue'
import { formatDate, STATUS_SURAT_KELUAR } from '~/utils/formatters'

const route = useRoute()
const { can } = useRBAC()
if (!can('buat_surat')) {
  await navigateTo('/disposisi')
}

const q = ref('')
const status = ref(typeof route.query.status === 'string' ? route.query.status : '')
const page = ref(1)

const statusFilters = [
  { value: '', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'menunggu_approval', label: 'Menunggu' },
  { value: 'disetujui', label: 'Disetujui' },
  { value: 'ditolak', label: 'Ditolak' },
  { value: 'dikirim', label: 'Dikirim' },
  { value: 'arsip', label: 'Arsip' },
]

const { data, pending } = await useFetch('/api/surat-keluar', {
  query: computed(() => ({
    q: q.value || undefined,
    status: status.value || undefined,
    page: page.value,
    limit: 10,
  })),
  watch: [q, status, page],
})

const rows = computed(() => data.value?.data || [])
const meta = computed(() => data.value?.meta || { page: 1, totalPages: 1, total: 0, limit: 10 })

watch([q, status], () => {
  page.value = 1
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 class="text-display-md text-ink tracking-tight">
          Surat Keluar
        </h1>
        <p class="text-body-sm text-steel mt-1">
          Draft, approval, dan pengiriman ({{ meta.total }} data)
        </p>
      </div>
      <NuxtLink to="/surat-keluar/baru">
        <UiButton>
          <Plus class="w-4 h-4" />
          Buat Surat
        </UiButton>
      </NuxtLink>
    </div>

    <div class="flex flex-col lg:flex-row gap-3 lg:items-center">
      <div class="w-full lg:max-w-sm">
        <UiSearchPill v-model="q" placeholder="Cari nomor, perihal, penerima..." />
      </div>
      <div class="flex flex-wrap gap-2">
        <UiFilterChip
          v-for="f in statusFilters"
          :key="f.value"
          :label="f.label"
          :active="status === f.value"
          @click="status = f.value"
        />
      </div>
    </div>

    <div class="card-base !p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-surface">
            <tr>
              <th class="px-4 py-3 text-caption-bold text-steel">
                No
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Perihal
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Penerima
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Tanggal
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Status
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Klasifikasi
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td colspan="6" class="px-4 py-10 text-center text-body-sm text-steel">
                Memuat...
              </td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="6" class="px-4 py-10 text-center text-body-sm text-steel">
                Tidak ada data
              </td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="border-t border-hairline-soft hover:bg-surface/60 cursor-pointer"
              @click="navigateTo(`/surat-keluar/${row.id}`)"
            >
              <td class="px-4 py-3 text-body-sm font-medium text-ink whitespace-nowrap">
                {{ row.nomorSurat || '(draft)' }}
              </td>
              <td class="px-4 py-3 text-body-sm text-charcoal max-w-xs truncate">
                {{ row.perihal }}
              </td>
              <td class="px-4 py-3 text-body-sm text-steel max-w-[12rem] truncate">
                {{ row.penerima || row.tujuanInstansi?.nama || '—' }}
              </td>
              <td class="px-4 py-3 text-body-sm text-steel whitespace-nowrap">
                {{ formatDate(row.tanggalSurat) }}
              </td>
              <td class="px-4 py-3">
                <span :class="STATUS_SURAT_KELUAR[row.status]?.class || 'badge-muted'">
                  {{ STATUS_SURAT_KELUAR[row.status]?.label || row.status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  v-if="row.klasifikasi"
                  class="badge-code"
                  :style="{ backgroundColor: row.klasifikasi.warna + '22', color: row.klasifikasi.warna }"
                >
                  {{ row.klasifikasi.nama }}
                </span>
                <span v-else class="text-body-sm text-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-4 border-t border-hairline-soft">
        <UiPagination
          :page="meta.page"
          :total-pages="meta.totalPages"
          :total="meta.total"
          :limit="meta.limit"
          @update:page="page = $event"
        />
      </div>
    </div>
  </div>
</template>
