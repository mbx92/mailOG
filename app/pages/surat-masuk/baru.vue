<script setup>
import { Upload, X, FileText } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { formatBytes } from '~/utils/formatters'

const { can } = useRBAC()
if (!can('registrasi_surat')) {
  await navigateTo('/surat-masuk')
}

const [{ data: instansiData }, { data: unitData }, { data: klasifikasiData }] = await Promise.all([
  useFetch('/api/instansi'),
  useFetch('/api/unit'),
  useFetch('/api/klasifikasi'),
])

const form = reactive({
  nomorSurat: '',
  perihal: '',
  isiRingkasan: '',
  asalInstansiId: '',
  pengirim: '',
  tanggalSurat: new Date().toISOString().slice(0, 10),
  tanggalDiterima: new Date().toISOString().slice(0, 10),
  tujuanUnitId: '',
  klasifikasiId: '',
  catatanInternal: '',
})

/** @type {import('vue').Ref<File[]>} */
const files = ref([])
const fileInput = ref(null)
const loading = ref(false)
const error = ref('')
const dragOver = ref(false)

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx'
const MAX_BYTES = 20 * 1024 * 1024

function onPickFiles(list) {
  error.value = ''
  const incoming = Array.from(list || [])
  for (const f of incoming) {
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
  body.append('jenis', 'masuk')
  body.append('instansiKode', 'GENERAL')
  return $fetch('/api/lampiran/upload', { method: 'POST', body })
}

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch('/api/surat-masuk', {
      method: 'POST',
      body: {
        ...form,
        asalInstansiId: form.asalInstansiId || null,
        tujuanUnitId: form.tujuanUnitId || null,
        klasifikasiId: form.klasifikasiId || null,
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
      catch (e) {
        failed.push(file.name)
        console.warn('upload fail', file.name, e)
      }
    }

    if (failed.length && uploaded === 0) {
      toast.error('Surat tersimpan, tetapi semua lampiran gagal diunggah')
    }
    else if (failed.length) {
      toast.warning(`Surat tersimpan. ${uploaded} lampiran OK, gagal: ${failed.join(', ')}`)
    }
    else {
      toast.success(
        files.value.length
          ? `Surat masuk & ${uploaded} lampiran berhasil disimpan`
          : 'Surat masuk berhasil diregistrasi',
      )
    }

    await navigateTo(`/surat-masuk/${suratId}`)
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
      <NuxtLink to="/surat-masuk" class="btn-link text-steel mb-2 inline-flex">
        ← Kembali
      </NuxtLink>
      <h1 class="text-display-md text-ink tracking-tight">
        Registrasi Surat Masuk
      </h1>
      <p class="text-body-sm text-steel mt-1">
        Catat surat masuk baru ke dalam sistem
      </p>
    </div>

    <form class="card-base space-y-5" @submit.prevent="onSubmit">
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Nomor Surat</label>
          <input v-model="form.nomorSurat" required class="input-field" placeholder="001/XXX/2026">
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

      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Ringkasan Isi</label>
        <textarea v-model="form.isiRingkasan" rows="3" class="input-field h-auto py-2.5" placeholder="Ringkasan singkat isi surat" />
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Asal Instansi</label>
          <select v-model="form.asalInstansiId" class="input-field">
            <option value="">
              Pilih instansi
            </option>
            <option v-for="i in instansiData?.data || []" :key="i.id" :value="i.id">
              {{ i.nama }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Pengirim</label>
          <input v-model="form.pengirim" class="input-field" placeholder="Nama penandatangan">
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Tanggal Surat</label>
          <input v-model="form.tanggalSurat" type="date" required class="input-field">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Tanggal Diterima</label>
          <input v-model="form.tanggalDiterima" type="date" required class="input-field">
        </div>
      </div>

      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Tujuan Unit</label>
        <select v-model="form.tujuanUnitId" class="input-field">
          <option value="">
            Pilih unit
          </option>
          <option v-for="u in unitData?.data || []" :key="u.id" :value="u.id">
            {{ u.nama }} ({{ u.kode }})
          </option>
        </select>
      </div>

      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Catatan Internal</label>
        <textarea v-model="form.catatanInternal" rows="2" class="input-field h-auto py-2.5" />
      </div>

      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Lampiran</label>
        <p class="text-caption text-muted mb-2">
          PDF, gambar, atau Word · maks. 20 MB per file
        </p>

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
            <button
              type="button"
              class="btn-icon"
              aria-label="Hapus file"
              @click="removeFile(idx)"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </li>
        </ul>
      </div>

      <p v-if="error" class="text-body-sm text-error">
        {{ error }}
      </p>

      <div class="flex gap-3 justify-end pt-2">
        <NuxtLink to="/surat-masuk">
          <UiButton variant="tertiary" type="button">
            Batal
          </UiButton>
        </NuxtLink>
        <UiButton type="submit" :disabled="loading">
          {{ loading ? 'Menyimpan...' : 'Simpan' }}
        </UiButton>
      </div>
    </form>
  </div>
</template>
