<script setup>
import { Download, Printer } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { STATUS_SURAT_MASUK, STATUS_DISPOSISI } from '~/utils/formatters'

const { can } = useRBAC()
if (!can('export')) {
  await navigateTo('/')
}

const isOps = computed(() => can('registrasi_surat'))
const now = new Date()
const tahun = ref(now.getFullYear())
const bulan = ref(now.getMonth() + 1)

const tahunOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i)
const bulanOptions = [
  { value: '', label: 'Semua bulan' },
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
]

const { data, pending, refresh, error } = await useFetch('/api/laporan/rekap', {
  query: computed(() => ({
    tahun: tahun.value,
    bulan: bulan.value === '' || bulan.value == null ? undefined : bulan.value,
  })),
  watch: [tahun, bulan],
})

const rekap = computed(() => data.value?.data)
const ringkasan = computed(() => rekap.value?.ringkasan || {})

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const trendChart = computed(() => {
  const map = new Map((rekap.value?.trendBulanan || []).map((r) => [r.bulan, Number(r.value) || 0]))
  const labels = []
  const values = []
  const cursor = new Date()
  cursor.setDate(1)
  cursor.setMonth(cursor.getMonth() - 11)
  for (let i = 0; i < 12; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    labels.push(`${BULAN_SINGKAT[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`)
    values.push(map.get(key) ?? 0)
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return { labels, values }
})

function maxVal(rows) {
  return Math.max(1, ...(rows || []).map((r) => Number(r.value) || 0))
}

function statusLabel(map, key) {
  return map[key]?.label || key
}

function statusClass(map, key) {
  return map[key]?.class || 'badge-muted'
}

async function exportCsv(type) {
  try {
    const q = new URLSearchParams({
      type,
      tahun: String(tahun.value),
    })
    if (bulan.value) q.set('bulan', String(bulan.value))
    const res = await fetch(`/api/laporan/export?${q}`, { credentials: 'include' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.statusMessage || j.message || 'Export gagal')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-${type}-${tahun.value}${bulan.value ? `-${String(bulan.value).padStart(2, '0')}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export CSV berhasil')
  }
  catch (e) {
    toast.error(e.message || 'Export gagal')
  }
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="space-y-6 laporan-page">
    <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 print:block">
      <div>
        <h1 class="text-display-md text-ink tracking-tight">
          Laporan
        </h1>
        <p class="text-body-sm text-steel mt-1">
          Rekap surat & disposisi
          <span v-if="rekap?.periode">· {{ rekap.periode.label }}</span>
          <span v-if="rekap?.scope === 'unit'"> · scope unit Anda</span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2 print:hidden">
        <UiButton variant="tertiary" @click="printReport">
          <Printer class="w-4 h-4" />
          Cetak / PDF
        </UiButton>
      </div>
    </div>

    <div class="card-base flex flex-col sm:flex-row gap-3 sm:items-end print:hidden">
      <div class="flex-1">
        <label class="block text-caption-bold text-steel mb-1.5">Tahun</label>
        <select v-model.number="tahun" class="input-field">
          <option v-for="y in tahunOptions" :key="y" :value="y">
            {{ y }}
          </option>
        </select>
      </div>
      <div class="flex-1">
        <label class="block text-caption-bold text-steel mb-1.5">Bulan</label>
        <select v-model="bulan" class="input-field">
          <option
            v-for="b in bulanOptions"
            :key="String(b.value)"
            :value="b.value"
          >
            {{ b.label }}
          </option>
        </select>
      </div>
      <UiButton variant="secondary" :disabled="pending" @click="refresh()">
        Muat ulang
      </UiButton>
    </div>

    <div v-if="pending" class="text-body-sm text-steel">
      Memuat laporan...
    </div>
    <div v-else-if="error" class="text-body-sm text-error">
      Gagal memuat laporan
    </div>

    <template v-else-if="rekap">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="card-base relative overflow-hidden">
          <div class="absolute left-0 top-0 h-full w-1.5 bg-brand-coral" />
          <p class="text-body-sm text-steel pl-3">
            Surat Masuk
          </p>
          <p class="text-display-md text-ink tracking-tight pl-3 mt-1">
            {{ ringkasan.suratMasuk }}
          </p>
        </div>
        <div v-if="isOps" class="card-base relative overflow-hidden">
          <div class="absolute left-0 top-0 h-full w-1.5 bg-brand-blue" />
          <p class="text-body-sm text-steel pl-3">
            Surat Keluar
          </p>
          <p class="text-display-md text-ink tracking-tight pl-3 mt-1">
            {{ ringkasan.suratKeluar }}
          </p>
        </div>
        <div class="card-base relative overflow-hidden">
          <div class="absolute left-0 top-0 h-full w-1.5 bg-brand-purple" />
          <p class="text-body-sm text-steel pl-3">
            Disposisi
          </p>
          <p class="text-display-md text-ink tracking-tight pl-3 mt-1">
            {{ ringkasan.disposisi }}
          </p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-4">
        <section class="card-base space-y-4">
          <h2 class="text-title-md text-ink">
            Surat masuk per status
          </h2>
          <div v-if="!rekap.suratMasukByStatus?.length" class="text-body-sm text-steel">
            Tidak ada data
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="row in rekap.suratMasukByStatus"
              :key="row.status"
              class="space-y-1"
            >
              <div class="flex justify-between text-caption">
                <span :class="statusClass(STATUS_SURAT_MASUK, row.status)">
                  {{ statusLabel(STATUS_SURAT_MASUK, row.status) }}
                </span>
                <span class="text-ink font-medium">
                  {{ row.value }}
                </span>
              </div>
              <div class="h-2 rounded-full bg-surface overflow-hidden">
                <div
                  class="h-full rounded-full bg-brand-coral"
                  :style="{ width: `${(row.value / maxVal(rekap.suratMasukByStatus)) * 100}%` }"
                />
              </div>
            </li>
          </ul>
        </section>

        <section class="card-base space-y-4">
          <h2 class="text-title-md text-ink">
            Disposisi per status
          </h2>
          <div v-if="!rekap.disposisiByStatus?.length" class="text-body-sm text-steel">
            Tidak ada data
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="row in rekap.disposisiByStatus"
              :key="row.status"
              class="space-y-1"
            >
              <div class="flex justify-between text-caption">
                <span :class="statusClass(STATUS_DISPOSISI, row.status)">
                  {{ statusLabel(STATUS_DISPOSISI, row.status) }}
                </span>
                <span class="text-ink font-medium">
                  {{ row.value }}
                </span>
              </div>
              <div class="h-2 rounded-full bg-surface overflow-hidden">
                <div
                  class="h-full rounded-full bg-brand-purple"
                  :style="{ width: `${(row.value / maxVal(rekap.disposisiByStatus)) * 100}%` }"
                />
              </div>
            </li>
          </ul>
        </section>
      </div>

      <section class="card-base space-y-4">
        <h2 class="text-title-md text-ink">
          Tren surat masuk (12 bulan)
        </h2>
        <UiLineChart
          :labels="trendChart.labels"
          :values="trendChart.values"
          label="Surat masuk"
          color="#ff5530"
        />
      </section>

      <div class="grid lg:grid-cols-2 gap-4">
        <section class="card-base space-y-3">
          <h2 class="text-title-md text-ink">
            Surat masuk per unit tujuan
          </h2>
          <div class="overflow-x-auto rounded-md border border-hairline">
            <table class="w-full text-left">
              <thead class="bg-surface">
                <tr>
                  <th class="px-3 py-2 text-caption-bold text-steel">
                    Unit
                  </th>
                  <th class="px-3 py-2 text-caption-bold text-steel text-right">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!rekap.suratMasukByUnit?.length">
                  <td colspan="2" class="px-3 py-6 text-center text-body-sm text-steel">
                    Tidak ada data
                  </td>
                </tr>
                <tr
                  v-for="row in rekap.suratMasukByUnit"
                  :key="row.unitId || row.nama"
                  class="border-t border-hairline-soft"
                >
                  <td class="px-3 py-2 text-body-sm text-ink">
                    {{ row.nama }}
                  </td>
                  <td class="px-3 py-2 text-body-sm text-ink text-right font-medium">
                    {{ row.value }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="card-base space-y-3">
          <h2 class="text-title-md text-ink">
            Disposisi per unit
          </h2>
          <div class="overflow-x-auto rounded-md border border-hairline">
            <table class="w-full text-left">
              <thead class="bg-surface">
                <tr>
                  <th class="px-3 py-2 text-caption-bold text-steel">
                    Unit
                  </th>
                  <th class="px-3 py-2 text-caption-bold text-steel text-right">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!rekap.disposisiByUnit?.length">
                  <td colspan="2" class="px-3 py-6 text-center text-body-sm text-steel">
                    Tidak ada data
                  </td>
                </tr>
                <tr
                  v-for="row in rekap.disposisiByUnit"
                  :key="row.unitId || row.nama"
                  class="border-t border-hairline-soft"
                >
                  <td class="px-3 py-2 text-body-sm text-ink">
                    {{ row.nama }}
                  </td>
                  <td class="px-3 py-2 text-body-sm text-ink text-right font-medium">
                    {{ row.value }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section class="card-base space-y-3 print:hidden">
        <h2 class="text-title-md text-ink">
          Export CSV
        </h2>
        <p class="text-body-sm text-steel">
          Unduh data detail sesuai filter tahun/bulan di atas.
        </p>
        <div class="flex flex-wrap gap-2">
          <UiButton variant="secondary" @click="exportCsv('surat-masuk')">
            <Download class="w-4 h-4" />
            Surat Masuk
          </UiButton>
          <UiButton v-if="isOps" variant="secondary" @click="exportCsv('surat-keluar')">
            <Download class="w-4 h-4" />
            Surat Keluar
          </UiButton>
          <UiButton variant="secondary" @click="exportCsv('disposisi')">
            <Download class="w-4 h-4" />
            Disposisi
          </UiButton>
        </div>
      </section>
    </template>
  </div>
</template>

<style>
@media print {
  .print\:hidden { display: none !important; }
  aside, header { display: none !important; }
  .laporan-page { max-width: 100% !important; }
}
</style>
