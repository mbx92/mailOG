<script setup>
import { Archive, Eye, Download, Upload } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { formatDate, formatBytes, STATUS_SURAT_MASUK, STATUS_DISPOSISI } from '~/utils/formatters'

const { can, user } = useRBAC()
const route = useRoute()
const id = route.params.id

const { data, pending, error, refresh } = await useFetch(`/api/surat-masuk/${id}`)
const surat = computed(() => data.value?.data)

const { data: unitData } = await useFetch('/api/unit', {
  lazy: true,
  server: false,
})

const previewOpen = ref(false)
const previewFile = ref(null)
const actionBusy = ref(null)
const actionError = ref('')
const uploading = ref(false)
const fileInput = ref(null)
const dragOver = ref(false)
const statusBusy = ref(false)
const archiveDialogOpen = ref(false)
const unarchiveDialogOpen = ref(false)

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx'
const MAX_BYTES = 20 * 1024 * 1024
const canUpload = computed(() => can('registrasi_surat'))
const canArchive = computed(() => can('registrasi_surat') || can('edit_surat_all'))
const canCreateDisposisi = computed(() => can('disposisi'))
const isArchived = computed(() => surat.value?.status === 'arsip')

/** Unit staff tindak lanjut; admin/sekretaris yang buat disposisi hanya pantau */
function canActOnDisposisi(d) {
  if (!d || d.status === 'selesai') return false
  if (can('disposisi')) return false
  if (!can('terima_disposisi')) return false
  const u = user.value
  if (!u) return false
  return (u.unitId && d.keUnitId === u.unitId) || d.keUserId === u.id
}

const dspForm = reactive({
  keUnitId: '',
  instruksi: '',
  batasWaktu: '',
})
const dspLoading = ref(false)
const dspError = ref('')

function canPreview(file) {
  if (!file?.path || String(file.path).startsWith('legacy-missing/')) return false
  const mime = String(file.mimeType || '').toLowerCase()
  const name = String(file.namaFile || '').toLowerCase()
  return (
    mime.includes('pdf')
    || name.endsWith('.pdf')
    || mime.startsWith('image/')
    || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name)
  )
}

function fileAvailable(file) {
  return Boolean(file?.path) && !String(file.path).startsWith('legacy-missing/')
}

function openPreview(file) {
  actionError.value = ''
  previewFile.value = file
  previewOpen.value = true
}

function closePreview() {
  previewOpen.value = false
  previewFile.value = null
}

function downloadFile(file) {
  if (!fileAvailable(file)) {
    actionError.value = 'File lampiran tidak tersedia di penyimpanan'
    return
  }
  actionBusy.value = file.id
  actionError.value = ''
  try {
    window.location.href = `/api/lampiran/${file.id}/file?download=1`
  }
  finally {
    actionBusy.value = null
  }
}

async function uploadOne(file) {
  const body = new FormData()
  body.append('file', file)
  body.append('suratId', String(id))
  body.append('jenis', 'masuk')
  body.append('instansiKode', 'GENERAL')
  return $fetch('/api/lampiran/upload', { method: 'POST', body })
}

async function onPickFiles(list) {
  if (!canUpload.value || uploading.value) return
  const incoming = Array.from(list || [])
  if (!incoming.length) return

  actionError.value = ''
  uploading.value = true
  let ok = 0
  const failed = []

  try {
    for (const file of incoming) {
      if (file.size > MAX_BYTES) {
        failed.push(`${file.name} (max 20 MB)`)
        continue
      }
      try {
        await uploadOne(file)
        ok++
      }
      catch (e) {
        failed.push(file.name)
        console.warn('upload fail', file.name, e)
      }
    }

    if (ok) await refresh()

    if (failed.length && !ok) {
      actionError.value = `Gagal mengunggah: ${failed.join(', ')}`
      toast.error(actionError.value)
    }
    else if (failed.length) {
      toast.warning(`${ok} file tersimpan, gagal: ${failed.join(', ')}`)
    }
    else {
      toast.success(`${ok} lampiran berhasil ditambahkan`)
    }
  }
  finally {
    uploading.value = false
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

async function submitDisposisi() {
  dspError.value = ''
  if (!dspForm.keUnitId || !dspForm.instruksi.trim()) {
    dspError.value = 'Unit tujuan dan instruksi wajib diisi'
    return
  }
  dspLoading.value = true
  try {
    await $fetch('/api/disposisi', {
      method: 'POST',
      body: {
        suratId: id,
        keUnitId: dspForm.keUnitId,
        instruksi: dspForm.instruksi.trim(),
        batasWaktu: dspForm.batasWaktu || null,
      },
    })
    dspForm.keUnitId = ''
    dspForm.instruksi = ''
    dspForm.batasWaktu = ''
    toast.success('Disposisi dikirim — notifikasi ke user unit tujuan')
    await refresh()
  }
  catch (e) {
    dspError.value = e?.data?.statusMessage || e?.data?.message || 'Gagal membuat disposisi'
    toast.error(dspError.value)
  }
  finally {
    dspLoading.value = false
  }
}

async function setSuratStatus(status) {
  if (!canArchive.value || statusBusy.value) return
  const label = STATUS_SURAT_MASUK[status]?.label || status
  statusBusy.value = true
  try {
    await $fetch(`/api/surat-masuk/${id}`, {
      method: 'PUT',
      body: { status },
    })
    archiveDialogOpen.value = false
    unarchiveDialogOpen.value = false
    await refresh()
    toast.success(status === 'arsip' ? 'Surat diarsipkan' : `Status: ${label}`)
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal mengubah status')
  }
  finally {
    statusBusy.value = false
  }
}

async function updateDisposisiStatus(disposisiId, status) {
  try {
    await $fetch(`/api/disposisi/${disposisiId}`, {
      method: 'PUT',
      body: { status },
    })
    toast.success(`Status: ${STATUS_DISPOSISI[status]?.label || status}`)
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal update disposisi')
  }
}
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <div>
      <NuxtLink to="/surat-masuk" class="btn-link text-steel mb-2 inline-flex">
        ← Kembali ke daftar
      </NuxtLink>
      <div v-if="pending" class="text-body-sm text-steel">
        Memuat...
      </div>
      <div v-else-if="error" class="text-body-sm text-error">
        Surat tidak ditemukan
      </div>
      <template v-else-if="surat">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-display-sm text-ink tracking-tight">
              {{ surat.perihal }}
            </h1>
            <p class="text-body-sm text-steel mt-1">
              {{ surat.nomorSurat }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span :class="STATUS_SURAT_MASUK[surat.status]?.class || 'badge-muted'">
              {{ STATUS_SURAT_MASUK[surat.status]?.label || surat.status }}
            </span>
            <UiButton
              v-if="canArchive && !isArchived"
              variant="secondary"
              :disabled="statusBusy"
              @click="archiveDialogOpen = true"
            >
              <Archive class="w-4 h-4" />
              Arsipkan
            </UiButton>
            <UiButton
              v-else-if="canArchive && isArchived"
              variant="tertiary"
              :disabled="statusBusy"
              @click="unarchiveDialogOpen = true"
            >
              Keluarkan dari arsip
            </UiButton>
          </div>
        </div>
      </template>
    </div>

    <template v-if="surat">
      <section class="card-base space-y-4">
        <h2 class="text-title-md text-ink">
          Detail Surat
        </h2>
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          <div class="border-b border-hairline-soft pb-3">
            <dt class="text-caption text-muted">
              Pengirim
            </dt>
            <dd class="text-body-sm text-ink mt-0.5">
              {{ surat.pengirim || '—' }}
            </dd>
          </div>
          <div class="border-b border-hairline-soft pb-3">
            <dt class="text-caption text-muted">
              Asal Instansi
            </dt>
            <dd class="text-body-sm text-ink mt-0.5">
              {{ surat.asalInstansi?.nama || '—' }}
            </dd>
          </div>
          <div class="border-b border-hairline-soft pb-3">
            <dt class="text-caption text-muted">
              Tanggal Surat
            </dt>
            <dd class="text-body-sm text-ink mt-0.5">
              {{ formatDate(surat.tanggalSurat) }}
            </dd>
          </div>
          <div class="border-b border-hairline-soft pb-3">
            <dt class="text-caption text-muted">
              Tanggal Diterima
            </dt>
            <dd class="text-body-sm text-ink mt-0.5">
              {{ formatDate(surat.tanggalDiterima) }}
            </dd>
          </div>
          <div class="border-b border-hairline-soft pb-3">
            <dt class="text-caption text-muted">
              Tujuan Unit
            </dt>
            <dd class="text-body-sm text-ink mt-0.5">
              {{ surat.tujuanUnit?.nama || '—' }}
            </dd>
          </div>
          <div class="border-b border-hairline-soft pb-3">
            <dt class="text-caption text-muted">
              Klasifikasi
            </dt>
            <dd class="text-body-sm text-ink mt-0.5">
              {{ surat.klasifikasi?.nama || '—' }}
            </dd>
          </div>
          <div class="sm:col-span-2 border-b border-hairline-soft pb-3">
            <dt class="text-caption text-muted">
              Ringkasan
            </dt>
            <dd class="text-body-sm text-charcoal mt-0.5 whitespace-pre-wrap">
              {{ surat.isiRingkasan || '—' }}
            </dd>
          </div>
          <div v-if="surat.catatanInternal" class="sm:col-span-2">
            <dt class="text-caption text-muted">
              Catatan Internal
            </dt>
            <dd class="text-body-sm text-charcoal mt-0.5">
              {{ surat.catatanInternal }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="card-base">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 class="text-title-md text-ink">
            Lampiran
          </h2>
          <template v-if="canUpload">
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              multiple
              :accept="ACCEPT"
              :disabled="uploading"
              @change="onFileInput"
            >
            <UiButton
              variant="secondary"
              :disabled="uploading"
              @click="fileInput?.click()"
            >
              <span class="inline-flex items-center gap-1.5">
                <Upload class="w-3.5 h-3.5" />
                {{ uploading ? 'Mengunggah...' : 'Tambah file' }}
              </span>
            </UiButton>
          </template>
        </div>

        <p v-if="actionError" class="text-body-sm text-error mb-3">
          {{ actionError }}
        </p>

        <div
          v-if="canUpload"
          class="rounded-xl border border-dashed px-4 py-5 text-center mb-4 transition-colors"
          :class="dragOver ? 'border-ink bg-surface' : 'border-hairline'"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
        >
          <p class="text-body-sm text-steel">
            {{ uploading ? 'Sedang mengunggah...' : 'Seret file ke sini untuk menambah lampiran (boleh lebih dari satu)' }}
          </p>
        </div>

        <div v-if="!surat.lampiran?.length" class="text-body-sm text-steel">
          Belum ada lampiran
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="file in surat.lampiran"
            :key="file.id"
            class="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-hairline-soft last:border-0"
          >
            <div class="min-w-0">
              <p class="text-body-sm font-medium text-ink truncate">
                {{ file.namaFile }}
              </p>
              <p class="text-caption text-muted">
                {{ formatBytes(file.size) }} · {{ file.mimeType }}
                <span v-if="!fileAvailable(file)" class="text-error"> · file tidak tersedia</span>
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UiButton
                v-if="canPreview(file)"
                variant="secondary"
                :disabled="actionBusy === file.id || uploading"
                @click="openPreview(file)"
              >
                <span class="inline-flex items-center gap-1.5">
                  <Eye class="w-3.5 h-3.5" />
                  Lihat
                </span>
              </UiButton>
              <UiButton
                variant="tertiary"
                :disabled="!fileAvailable(file) || actionBusy === file.id || uploading"
                @click="downloadFile(file)"
              >
                <span class="inline-flex items-center gap-1.5">
                  <Download class="w-3.5 h-3.5" />
                  Unduh
                </span>
              </UiButton>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="canCreateDisposisi" class="card-base space-y-4">
        <h2 class="text-title-md text-ink">
          Buat Disposisi
        </h2>
        <p class="text-body-sm text-steel">
          Kirim ke unit — semua user aktif di unit tersebut mendapat notifikasi.
        </p>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Unit tujuan</label>
            <select v-model="dspForm.keUnitId" class="input-field">
              <option value="">
                Pilih unit
              </option>
              <option v-for="u in unitData?.data || []" :key="u.id" :value="u.id">
                {{ u.nama }} ({{ u.kode }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Batas waktu</label>
            <input v-model="dspForm.batasWaktu" type="date" class="input-field">
          </div>
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Instruksi</label>
          <textarea
            v-model="dspForm.instruksi"
            rows="3"
            class="input-field h-auto py-2.5"
            placeholder="Instruksi tindak lanjut..."
          />
        </div>
        <p v-if="dspError" class="text-body-sm text-error">
          {{ dspError }}
        </p>
        <div class="flex justify-end">
          <UiButton :disabled="dspLoading" @click="submitDisposisi">
            {{ dspLoading ? 'Mengirim...' : 'Kirim Disposisi' }}
          </UiButton>
        </div>
      </section>

      <section class="card-base">
        <h2 class="text-title-md text-ink mb-4">
          Riwayat Disposisi
        </h2>
        <div v-if="!surat.disposisi?.length" class="text-body-sm text-steel">
          Belum ada disposisi
        </div>
        <ul v-else class="space-y-3">
          <li
            v-for="d in surat.disposisi"
            :key="d.id"
            class="border border-hairline rounded-lg p-4"
          >
            <div class="flex flex-wrap justify-between gap-2 mb-1">
              <p class="text-body-sm font-medium text-ink">
                {{ d.keUnitNama || d.keUserNama || 'Disposisi' }}
                <span v-if="d.keUnitKode" class="text-steel font-normal">
                  ({{ d.keUnitKode }})
                </span>
              </p>
              <span :class="STATUS_DISPOSISI[d.status]?.class || 'badge-muted'">
                {{ STATUS_DISPOSISI[d.status]?.label || d.status }}
              </span>
            </div>
            <p class="text-body-sm text-charcoal">
              {{ d.instruksi || '—' }}
            </p>
            <p class="text-caption text-muted mt-2">
              <span v-if="d.dariUserNama">Dari {{ d.dariUserNama }} · </span>
              {{ formatDate(d.createdAt, true) }}
              <span v-if="d.batasWaktu"> · Batas {{ formatDate(d.batasWaktu) }}</span>
            </p>
            <div v-if="canActOnDisposisi(d)" class="flex flex-wrap gap-2 mt-3">
              <UiButton
                v-if="d.status === 'diterima'"
                variant="secondary"
                @click="updateDisposisiStatus(d.id, 'diproses')"
              >
                Proses
              </UiButton>
              <UiButton
                variant="tertiary"
                @click="updateDisposisiStatus(d.id, 'selesai')"
              >
                Selesai
              </UiButton>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <UiFilePreview
      :open="previewOpen"
      :file="previewFile"
      @close="closePreview"
    />

    <UiConfirmDialog
      :open="archiveDialogOpen"
      title="Arsipkan surat?"
      description="Surat dipindah ke arsip dan tetap bisa dilihat lewat filter Arsip di daftar Surat Masuk."
      confirm-label="Arsipkan"
      :loading="statusBusy"
      @close="archiveDialogOpen = false"
      @confirm="setSuratStatus('arsip')"
    />

    <UiConfirmDialog
      :open="unarchiveDialogOpen"
      title="Keluarkan dari arsip?"
      description="Status surat akan diubah menjadi Selesai dan muncul lagi di daftar aktif."
      confirm-label="Keluarkan"
      :loading="statusBusy"
      @close="unarchiveDialogOpen = false"
      @confirm="setSuratStatus('selesai')"
    />
  </div>
</template>
