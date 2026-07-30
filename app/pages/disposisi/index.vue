<script setup>
import { formatDate, STATUS_DISPOSISI } from '~/utils/formatters'

const { can } = useRBAC()
const isMonitor = computed(() => can('disposisi'))

if (!isMonitor.value) {
  await navigateTo('/surat-masuk')
}

const route = useRoute()
const q = ref('')
const status = ref(typeof route.query.status === 'string' ? route.query.status : 'diterima')
const page = ref(1)

const statusFilters = [
  { value: '', label: 'Semua' },
  { value: 'diterima', label: 'Belum ditindaklanjuti' },
  { value: 'diproses', label: 'Diproses unit' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'diteruskan', label: 'Diteruskan' },
]

const { data, pending } = await useFetch('/api/disposisi', {
  query: computed(() => ({
    q: q.value || undefined,
    status: status.value || undefined,
    page: page.value,
    limit: 20,
  })),
  watch: [q, status, page],
})

const rows = computed(() => data.value?.data || [])
const meta = computed(() => data.value?.meta || { page: 1, totalPages: 1, total: 0, limit: 20 })

watch([q, status], () => {
  page.value = 1
})

watch(status, (v) => {
  navigateTo({ path: '/disposisi', query: v ? { status: v } : {} }, { replace: true })
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-display-md text-ink tracking-tight">
        Monitoring Disposisi
      </h1>
      <p class="text-body-sm text-steel mt-1">
        Pantau apakah unit sudah menerima / menindaklanjuti surat yang Anda disposisikan.
      </p>
    </div>

    <div class="flex flex-col lg:flex-row gap-3 lg:items-center">
      <div class="w-full lg:max-w-sm">
        <UiSearchPill v-model="q" placeholder="Cari nomor, perihal, instruksi..." />
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

    <p class="text-caption text-muted">
      {{ meta.total }} disposisi
    </p>

    <div class="card-base !p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-surface">
            <tr>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Surat
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Instruksi
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Ke Unit
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Batas
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Status unit
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Dibuat
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td colspan="6" class="px-4 py-8 text-center text-body-sm text-steel">
                Memuat...
              </td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="6" class="px-4 py-8 text-center text-body-sm text-steel">
                Tidak ada disposisi
              </td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="border-t border-hairline-soft hover:bg-surface/60"
            >
              <td class="px-4 py-3 align-top">
                <NuxtLink
                  :to="`/surat-masuk/${row.suratId}`"
                  class="text-body-sm font-medium text-ink hover:underline"
                >
                  {{ row.nomorSurat || '—' }}
                </NuxtLink>
                <p class="text-caption text-steel mt-0.5 line-clamp-2 max-w-xs">
                  {{ row.perihal }}
                </p>
              </td>
              <td class="px-4 py-3 text-body-sm text-charcoal align-top max-w-sm">
                <p class="line-clamp-3">
                  {{ row.instruksi || '—' }}
                </p>
                <p v-if="row.dariUserNama" class="text-caption text-muted mt-1">
                  dari {{ row.dariUserNama }}
                </p>
              </td>
              <td class="px-4 py-3 text-body-sm text-steel align-top">
                {{ row.keUnitNama || row.keUserNama || '—' }}
              </td>
              <td class="px-4 py-3 text-body-sm text-steel align-top whitespace-nowrap">
                {{ formatDate(row.batasWaktu) }}
              </td>
              <td class="px-4 py-3 align-top">
                <span :class="STATUS_DISPOSISI[row.status]?.class || 'badge-muted'">
                  {{ STATUS_DISPOSISI[row.status]?.label || row.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-body-sm text-steel align-top whitespace-nowrap">
                {{ formatDate(row.createdAt, true) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <UiPagination
      :page="meta.page"
      :total-pages="meta.totalPages"
      :total="meta.total"
      :limit="meta.limit"
      @update:page="page = $event"
    />
  </div>
</template>
