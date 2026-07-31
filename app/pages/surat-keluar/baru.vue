<script setup>
import { Upload, X, FileText } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { formatBytes, formatDate } from '~/utils/formatters'
import { renderSuratKeluarHtml } from '~/utils/template-render'

const { can, user } = useRBAC()
if (!can('buat_surat')) {
  await navigateTo('/surat-keluar')
}

const [
  { data: instansiData },
  { data: unitData },
  { data: klasifikasiData },
  { data: templateData },
] = await Promise.all([
  useFetch('/api/instansi'),
  useFetch('/api/unit'),
  useFetch('/api/klasifikasi'),
  useFetch('/api/template', { query: { limit: 50 } }),
])

const defaultTemplate = computed(() => {
  const list = templateData.value?.data || []
  return list.find((t) => t.isDefault) || list[0] || null
})

const form = reactive({
  perihal: '',
  isiSurat: '',
  tujuanInstansiId: '',
  penerima: '',
  penerimaJabatan: '',
  penerimaAlamat: '',
  templateId: '',
  tanggalSurat: new Date().toISOString().slice(0, 10),
  unitId: user.value?.unitId || '',
  klasifikasiId: '',
  catatanInternal: '',
})

watch(defaultTemplate, (t) => {
  if (t && !form.templateId) form.templateId = t.id
}, { immediate: true })

const selectedTemplate = computed(() =>
  (templateData.value?.data || []).find((t) => t.id === form.templateId) || null,
)

const livePreview = computed(() =>
  renderSuratKeluarHtml(selectedTemplate.value, {
    ...form,
    nomorSurat: '(auto saat diajukan)',
  }, {
    tanggalFormatted: formatDate(form.tanggalSurat),
    pengirimNama: user.value?.nama || '',
    pengirimJabatan: user.value?.jabatan || '',
  }),
)

const files = ref([])
const fileInput = ref(null)
const loading = ref(false)
const error = ref('')
const dragOver = ref(false)

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx'
const MAX_BYTES = 20 * 1024 * 1024

function onPickFiles(list) {
  error.value = ''
  for (const f of Array.from(list || [])) {
    if (f.size > MAX_BYTES) {
      toast.error(`${f.name}: maksimal 20 MB`)
      continue
    }
    if (files.value.some((x) => x.name === f.name && x.size === f.size)) continue
    files.value.push(f)
  }
}

function onFileInput(e) {
  onPickFiles(e.target.files)
  e.target.value = ''
}

function onDrop(e) {
  dragOver.value = false
  onPickFiles(e.dataTransfer?.files)
}

function removeFile(idx) {
  files.value.splice(idx, 1)
}

async function uploadLampiran(suratId, file) {
  const body = new FormData()
  body.append('file', file)
  body.append('suratId', suratId)
  body.append('jenis', 'keluar')
  body.append('instansiKode', 'GENERAL')
  return $fetch('/api/lampiran/upload', { method: 'POST', body })
}

async function save(action) {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch('/api/surat-keluar', {
      method: 'POST',
      body: {
        ...form,
        tujuanInstansiId: form.tujuanInstansiId || null,
        templateId: form.templateId || null,
        unitId: form.unitId || null,
        klasifikasiId: form.klasifikasiId || null,
        action,
      },
    })

    const suratId = res.data.id
    let uploaded = 0
    const failed = []
    for (const file of files.value) {
      try {
        await uploadLampiran(suratId, file)
        uploaded++
      }
      catch {
        failed.push(file.name)
      }
    }

    if (failed.length) {
      toast.warning(`Surat tersimpan. Lampiran gagal: ${failed.join(', ')}`)
    }
    else {
      toast.success(
        action === 'submit'
          ? `Surat diajukan approval${res.data.nomorSurat ? ` · ${res.data.nomorSurat}` : ''}`
          : 'Draft surat keluar disimpan',
      )
    }
    await navigateTo(`/surat-keluar/${suratId}`)
  }
  catch (e) {
    error.value = e?.data?.statusMessage || e?.data?.message || 'Gagal menyimpan'
    toast.error(error.value)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <div>
      <NuxtLink to="/surat-keluar" class="btn-link text-steel mb-2 inline-flex">
        ← Kembali
      </NuxtLink>
      <h1 class="text-display-md text-ink tracking-tight">
        Buat Surat Keluar
      </h1>
      <p class="text-body-sm text-steel mt-1">
        Draft atau ajukan approval. Nomor otomatis saat diajukan.
      </p>
    </div>

    <form class="card-base space-y-5" @submit.prevent="save('draft')">
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Template</label>
          <select v-model="form.templateId" class="input-field">
            <option value="">
              Tanpa template
            </option>
            <option v-for="t in templateData?.data || []" :key="t.id" :value="t.id">
              {{ t.nama }} ({{ t.kode }})
            </option>
          </select>
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Klasifikasi</label>
          <select v-model="form.klasifikasiId" class="input-field">
            <option value="">
              Pilih klasifikasi
            </option>
            <option v-for="k in klasifikasiData?.data || []" :key="k.id" :value="k.id">
              {{ k.nama }}
            </option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Perihal</label>
        <input v-model="form.perihal" required class="input-field" placeholder="Perihal surat">
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Tanggal Surat</label>
          <input v-model="form.tanggalSurat" type="date" required class="input-field">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Unit Pengirim</label>
          <select v-model="form.unitId" class="input-field">
            <option value="">
              Pilih unit
            </option>
            <option v-for="u in unitData?.data || []" :key="u.id" :value="u.id">
              {{ u.nama }} ({{ u.kode }})
            </option>
          </select>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Instansi Tujuan</label>
          <select v-model="form.tujuanInstansiId" class="input-field">
            <option value="">
              Pilih instansi
            </option>
            <option v-for="i in instansiData?.data || []" :key="i.id" :value="i.id">
              {{ i.nama }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Penerima</label>
          <input v-model="form.penerima" class="input-field" placeholder="Nama penerima">
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Jabatan Penerima</label>
          <input v-model="form.penerimaJabatan" class="input-field">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Alamat Penerima</label>
          <input v-model="form.penerimaAlamat" class="input-field">
        </div>
      </div>

      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Isi Surat</label>
        <ClientOnly>
          <UiRichEditor v-model="form.isiSurat" placeholder="Tulis isi surat..." />
        </ClientOnly>
      </div>

      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Pratinjau surat</label>
        <UiLetterPreview :rendered="livePreview" />
      </div>

      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Catatan Internal</label>
        <textarea v-model="form.catatanInternal" rows="2" class="input-field h-auto py-2.5" />
      </div>

      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Lampiran</label>
        <div
          class="rounded-xl border border-dashed px-4 py-8 text-center transition-colors"
          :class="dragOver ? 'border-ink bg-surface' : 'border-hairline bg-canvas'"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
        >
          <Upload class="w-6 h-6 text-steel mx-auto mb-2" />
          <p class="text-body-sm text-charcoal mb-3">
            Seret file ke sini, atau
          </p>
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            multiple
            :accept="ACCEPT"
            @change="onFileInput"
          >
          <UiButton variant="secondary" type="button" @click="fileInput?.click()">
            Pilih file
          </UiButton>
        </div>
        <ul v-if="files.length" class="mt-3 space-y-2">
          <li
            v-for="(file, idx) in files"
            :key="`${file.name}-${file.size}-${idx}`"
            class="flex items-center gap-3 py-2 px-3 rounded-lg border border-hairline-soft"
          >
            <FileText class="w-4 h-4 text-steel shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-body-sm text-ink truncate">
                {{ file.name }}
              </p>
              <p class="text-caption text-muted">
                {{ formatBytes(file.size) }}
              </p>
            </div>
            <button type="button" class="btn-icon" @click="removeFile(idx)">
              <X class="w-3.5 h-3.5" />
            </button>
          </li>
        </ul>
      </div>

      <p v-if="error" class="text-body-sm text-error">
        {{ error }}
      </p>

      <div class="flex flex-wrap gap-3 justify-end pt-2">
        <NuxtLink to="/surat-keluar">
          <UiButton variant="tertiary" type="button">
            Batal
          </UiButton>
        </NuxtLink>
        <UiButton variant="secondary" type="button" :disabled="loading" @click="save('draft')">
          {{ loading ? 'Menyimpan...' : 'Simpan Draft' }}
        </UiButton>
        <UiButton type="button" :disabled="loading" @click="save('submit')">
          Ajukan Approval
        </UiButton>
      </div>
    </form>
  </div>
</template>
