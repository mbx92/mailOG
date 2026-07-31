<script setup>
import { Plus, Hash } from '@lucide/vue'
import { toast } from 'vue-sonner'

const { can } = useRBAC()
if (!can('buat_surat') && !can('pengaturan')) {
  await navigateTo('/')
}

const now = new Date()
const tahun = ref(now.getFullYear())
const bulan = ref(now.getMonth() + 1)
const loadingFormat = ref(false)
const loadingCounter = ref(false)
const showAdd = ref(false)

const tahunOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i + 1)
const bulanOptions = [
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

const [{ data, pending, refresh }, { data: unitData }] = await Promise.all([
  useFetch('/api/nomor-surat', {
    query: computed(() => ({
      tahun: tahun.value,
      bulan: bulan.value || undefined,
    })),
    watch: [tahun, bulan],
  }),
  useFetch('/api/unit', { lazy: true, server: false }),
])

const formatForm = reactive({
  format: '{SEQ} / {UNIT} / {MM} / {YYYY}',
  seqPad: 3,
})

watch(
  () => data.value?.data,
  (d) => {
    if (!d) return
    formatForm.format = d.format || '{SEQ} / {UNIT} / {MM} / {YYYY}'
    formatForm.seqPad = d.seqPad || 3
  },
  { immediate: true },
)

const counters = computed(() => data.value?.data?.counters || [])
const tokens = computed(() => data.value?.data?.tokens || [])

const contohLive = computed(() => {
  const pad = Math.max(1, Number(formatForm.seqPad) || 3)
  const seq = String(1).padStart(pad, '0')
  const y = tahun.value
  const m = String(bulan.value || 1).padStart(2, '0')
  const map = {
    SEQ: seq,
    UNIT: 'SEKRET',
    MM: m,
    YYYY: String(y),
    YY: String(y).slice(-2),
    DD: '01',
  }
  return String(formatForm.format || '').replace(/\{(SEQ|UNIT|MM|YYYY|YY|DD)\}/g, (_, k) => map[k])
})

const addForm = reactive({
  unitKode: '',
  counter: 0,
})

const editBusy = ref(null)
const editValues = reactive({})

watch(counters, (rows) => {
  for (const r of rows) {
    if (editValues[r.id] == null) editValues[r.id] = r.counter
  }
}, { immediate: true })

async function saveFormat() {
  loadingFormat.value = true
  try {
    const res = await $fetch('/api/nomor-surat/format', {
      method: 'PUT',
      body: {
        format: formatForm.format,
        seqPad: Number(formatForm.seqPad) || 3,
      },
    })
    toast.success(`Format disimpan · contoh: ${res.data.contoh}`)
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal menyimpan format')
  }
  finally {
    loadingFormat.value = false
  }
}

async function saveCounter(row) {
  editBusy.value = row.id
  try {
    await $fetch(`/api/nomor-surat/counter/${row.id}`, {
      method: 'PUT',
      body: { counter: Number(editValues[row.id]) || 0 },
    })
    toast.success('Counter diperbarui')
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal update counter')
  }
  finally {
    editBusy.value = null
  }
}

async function addCounter() {
  if (!addForm.unitKode) {
    toast.error('Pilih unit')
    return
  }
  loadingCounter.value = true
  try {
    const res = await $fetch('/api/nomor-surat/counter', {
      method: 'POST',
      body: {
        unitKode: addForm.unitKode,
        tahun: tahun.value,
        bulan: bulan.value,
        counter: Number(addForm.counter) || 0,
      },
    })
    toast.success(`Counter disimpan · berikutnya: ${res.data.contohBerikutnya}`)
    showAdd.value = false
    addForm.counter = 0
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal menambah counter')
  }
  finally {
    loadingCounter.value = false
  }
}

function insertToken(token) {
  formatForm.format = `${formatForm.format || ''}${token}`
}
</script>

<template>
  <div class="space-y-6 max-w-5xl">
    <div>
      <h1 class="text-display-md text-ink tracking-tight">
        Setup No. Surat
      </h1>
      <p class="text-body-sm text-steel mt-1">
        Format dan counter nomor surat keluar (reset per bulan per unit)
      </p>
    </div>

    <section class="card-base space-y-4">
      <div class="flex items-center gap-2">
        <Hash class="w-5 h-5 text-steel" />
        <h2 class="text-title-md text-ink">
          Format nomor
        </h2>
      </div>
      <p class="text-body-sm text-steel">
        Token tersedia:
        <button
          v-for="t in tokens"
          :key="t"
          type="button"
          class="badge-code mr-1 cursor-pointer hover:opacity-80"
          @click="insertToken(t)"
        >
          {{ t }}
        </button>
      </p>
      <div class="grid sm:grid-cols-[1fr_100px] gap-3">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Pola format</label>
          <input v-model="formatForm.format" class="input-field font-mono text-caption" placeholder="{SEQ} / {UNIT} / {MM} / {YYYY}">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Digit SEQ</label>
          <input v-model.number="formatForm.seqPad" type="number" min="1" max="8" class="input-field">
        </div>
      </div>
      <div class="rounded-lg bg-surface border border-hairline-soft px-4 py-3">
        <p class="text-caption text-muted">
          Contoh nomor berikutnya
        </p>
        <p class="text-body-md text-ink font-medium mt-1 font-mono">
          {{ contohLive }}
        </p>
      </div>
      <div class="flex justify-end">
        <UiButton :disabled="loadingFormat" @click="saveFormat">
          {{ loadingFormat ? 'Menyimpan...' : 'Simpan Format' }}
        </UiButton>
      </div>
    </section>

    <section class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <h2 class="text-title-md text-ink">
          Counter per unit
        </h2>
        <div class="flex flex-wrap gap-2 items-end">
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Tahun</label>
            <select v-model.number="tahun" class="input-field w-28">
              <option v-for="y in tahunOptions" :key="y" :value="y">
                {{ y }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Bulan</label>
            <select v-model.number="bulan" class="input-field w-40">
              <option v-for="b in bulanOptions" :key="b.value" :value="b.value">
                {{ b.label }}
              </option>
            </select>
          </div>
          <UiButton variant="secondary" @click="showAdd = true">
            <Plus class="w-4 h-4" />
            Set Counter
          </UiButton>
        </div>
      </div>

      <div class="card-base !p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-surface">
              <tr>
                <th class="px-4 py-3 text-caption-bold text-steel">
                  Unit
                </th>
                <th class="px-4 py-3 text-caption-bold text-steel">
                  Periode
                </th>
                <th class="px-4 py-3 text-caption-bold text-steel">
                  Counter terakhir
                </th>
                <th class="px-4 py-3 text-caption-bold text-steel">
                  Nomor berikutnya
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
              <tr v-else-if="!counters.length">
                <td colspan="5" class="px-4 py-8 text-center text-body-sm text-steel">
                  Belum ada counter untuk periode ini. Counter dibuat otomatis saat surat pertama diajukan, atau set manual.
                </td>
              </tr>
              <tr
                v-for="row in counters"
                :key="row.id"
                class="border-t border-hairline-soft"
              >
                <td class="px-4 py-3">
                  <p class="text-body-sm font-medium text-ink">
                    {{ row.unitKode }}
                  </p>
                  <p class="text-caption text-muted">
                    {{ row.unitNama || '—' }}
                  </p>
                </td>
                <td class="px-4 py-3 text-body-sm text-steel whitespace-nowrap">
                  {{ String(row.bulan).padStart(2, '0') }}/{{ row.tahun }}
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model.number="editValues[row.id]"
                    type="number"
                    min="0"
                    class="input-field w-24"
                  >
                </td>
                <td class="px-4 py-3 text-body-sm text-ink font-mono">
                  {{ row.contohBerikutnya }}
                </td>
                <td class="px-4 py-3">
                  <UiButton
                    variant="tertiary"
                    :disabled="editBusy === row.id"
                    @click="saveCounter(row)"
                  >
                    {{ editBusy === row.id ? '...' : 'Simpan' }}
                  </UiButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <UiSlidePanel :open="showAdd" title="Set Counter Unit" @close="showAdd = false">
      <div class="space-y-4">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Unit</label>
          <select v-model="addForm.unitKode" class="input-field">
            <option value="">
              Pilih unit
            </option>
            <option v-for="u in unitData?.data || []" :key="u.id" :value="u.kode">
              {{ u.nama }} ({{ u.kode }})
            </option>
          </select>
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">
            Counter terakhir ({{ String(bulan).padStart(2, '0') }}/{{ tahun }})
          </label>
          <input v-model.number="addForm.counter" type="number" min="0" class="input-field">
          <p class="text-caption text-muted mt-1.5">
            Surat berikutnya memakai counter + 1. Isi 0 jika mulai dari 001.
          </p>
        </div>
      </div>
      <template #footer>
        <UiButton variant="tertiary" @click="showAdd = false">
          Batal
        </UiButton>
        <UiButton :disabled="loadingCounter" @click="addCounter">
          {{ loadingCounter ? 'Menyimpan...' : 'Simpan' }}
        </UiButton>
      </template>
    </UiSlidePanel>
  </div>
</template>
