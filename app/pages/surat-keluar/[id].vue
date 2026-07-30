<script setup>
import { Eye, Download, Check, XCircle, Send, Pencil } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { formatDate, formatBytes, STATUS_SURAT_KELUAR } from '~/utils/formatters'
import { renderSuratKeluarHtml } from '~/utils/template-render'

const { can, user } = useRBAC()
if (!can('buat_surat')) {
  await navigateTo('/disposisi')
}

const route = useRoute()
const id = route.params.id

const { data, pending, error, refresh } = await useFetch(`/api/surat-keluar/${id}`)
const surat = computed(() => data.value?.data)

const previewOpen = ref(false)
const previewFile = ref(null)
const actionBusy = ref(null)
const actionError = ref('')
const busy = ref(false)
const rejectOpen = ref(false)
const rejectCatatan = ref('')
const editing = ref(false)

const [
  { data: instansiData },
  { data: unitData },
  { data: klasifikasiData },
  { data: templateData },
] = await Promise.all([
  useFetch('/api/instansi', { lazy: true, server: false }),
  useFetch('/api/unit', { lazy: true, server: false }),
  useFetch('/api/klasifikasi', { lazy: true, server: false }),
  useFetch('/api/template', { query: { limit: 50 }, lazy: true, server: false }),
])

const form = reactive({
  perihal: '',
  isiSurat: '',
  tujuanInstansiId: '',
  penerima: '',
  penerimaJabatan: '',
  penerimaAlamat: '',
  templateId: '',
  tanggalSurat: '',
  unitId: '',
  klasifikasiId: '',
  catatanInternal: '',
})

watch(surat, (s) => {
  if (!s) return
  Object.assign(form, {
    perihal: s.perihal || '',
    isiSurat: s.isiSurat || '',
    tujuanInstansiId: s.tujuanInstansiId || '',
    penerima: s.penerima || '',
    penerimaJabatan: s.penerimaJabatan || '',
    penerimaAlamat: s.penerimaAlamat || '',
    templateId: s.templateId || '',
    tanggalSurat: s.tanggalSurat || '',
    unitId: s.unitId || '',
    klasifikasiId: s.klasifikasiId || '',
    catatanInternal: s.catatanInternal || '',
  })
}, { immediate: true })

const canEdit = computed(() => ['draft', 'ditolak'].includes(surat.value?.status))
const canApprove = computed(() => can('approve_surat') && surat.value?.status === 'menunggu_approval')
const canKirim = computed(() => can('buat_surat') && surat.value?.status === 'disetujui')
const canSubmit = computed(() => canEdit.value)

const rendered = computed(() => {
  if (!surat.value) return null
  return renderSuratKeluarHtml(surat.value.template, surat.value, {
    tanggalFormatted: formatDate(surat.value.tanggalSurat),
    pengirimNama: surat.value.creator?.nama || user.value?.nama || '',
    pengirimJabatan: surat.value.creator?.jabatan || user.value?.jabatan || '',
  })
})

function canPreview(file) {
  if (!file?.path || String(file.path).startsWith('legacy-missing/')) return false
  const mime = String(file.mimeType || '').toLowerCase()
  const name = String(file.namaFile || '').toLowerCase()
  return mime.includes('pdf') || name.endsWith('.pdf') || mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name)
}

function fileAvailable(file) {
  return Boolean(file?.path) && !String(file.path).startsWith('legacy-missing/')
}

function openPreview(file) {
  previewFile.value = file
  previewOpen.value = true
}

function downloadFile(file) {
  if (!fileAvailable(file)) {
    actionError.value = 'File lampiran tidak tersedia'
    return
  }
  window.location.href = `/api/lampiran/${file.id}/file?download=1`
}

async function save(action = 'draft') {
  busy.value = true
  try {
    await $fetch(`/api/surat-keluar/${id}`, {
      method: 'PUT',
      body: {
        ...form,
        tujuanInstansiId: form.tujuanInstansiId || null,
        templateId: form.templateId || null,
        unitId: form.unitId || null,
        klasifikasiId: form.klasifikasiId || null,
        action,
      },
    })
    editing.value = false
    await refresh()
    toast.success(action === 'submit' ? 'Diajukan untuk approval' : 'Draft disimpan')
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal menyimpan')
  }
  finally {
    busy.value = false
  }
}

async function approve() {
  busy.value = true
  try {
    await $fetch(`/api/surat-keluar/${id}/approve`, { method: 'PUT' })
    await refresh()
    toast.success('Surat disetujui')
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal approve')
  }
  finally {
    busy.value = false
  }
}

async function reject() {
  busy.value = true
  try {
    await $fetch(`/api/surat-keluar/${id}/reject`, {
      method: 'PUT',
      body: { catatan: rejectCatatan.value || null },
    })
    rejectOpen.value = false
    rejectCatatan.value = ''
    await refresh()
    toast.success('Surat ditolak')
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal reject')
  }
  finally {
    busy.value = false
  }
}

async function kirim() {
  busy.value = true
  try {
    await $fetch(`/api/surat-keluar/${id}/kirim`, { method: 'PUT' })
    await refresh()
    toast.success('Surat ditandai dikirim')
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal kirim')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <div>
      <NuxtLink to="/surat-keluar" class="btn-link text-steel mb-2 inline-flex">
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
              {{ surat.nomorSurat || '(belum bernomor)' }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span :class="STATUS_SURAT_KELUAR[surat.status]?.class || 'badge-muted'">
              {{ STATUS_SURAT_KELUAR[surat.status]?.label || surat.status }}
            </span>
            <UiButton
              v-if="canEdit && !editing"
              variant="tertiary"
              @click="editing = true"
            >
              <Pencil class="w-4 h-4" />
              Edit
            </UiButton>
            <UiButton
              v-if="canSubmit && !editing"
              variant="secondary"
              :disabled="busy"
              @click="save('submit')"
            >
              Ajukan Approval
            </UiButton>
            <UiButton
              v-if="canApprove"
              :disabled="busy"
              @click="approve"
            >
              <Check class="w-4 h-4" />
              Approve
            </UiButton>
            <UiButton
              v-if="canApprove"
              variant="tertiary"
              :disabled="busy"
              @click="rejectOpen = true"
            >
              <XCircle class="w-4 h-4" />
              Tolak
            </UiButton>
            <UiButton
              v-if="canKirim"
              variant="secondary"
              :disabled="busy"
              @click="kirim"
            >
              <Send class="w-4 h-4" />
              Tandai Dikirim
            </UiButton>
          </div>
        </div>
      </template>
    </div>

    <template v-if="surat && editing">
      <section class="card-base space-y-4">
        <h2 class="text-title-md text-ink">
          Edit Surat
        </h2>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Template</label>
            <select v-model="form.templateId" class="input-field">
              <option value="">
                Tanpa template
              </option>
              <option v-for="t in templateData?.data || []" :key="t.id" :value="t.id">
                {{ t.nama }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Klasifikasi</label>
            <select v-model="form.klasifikasiId" class="input-field">
              <option value="">
                —
              </option>
              <option v-for="k in klasifikasiData?.data || []" :key="k.id" :value="k.id">
                {{ k.nama }}
              </option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Perihal</label>
          <input v-model="form.perihal" class="input-field" required>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Tanggal</label>
            <input v-model="form.tanggalSurat" type="date" class="input-field">
          </div>
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Unit</label>
            <select v-model="form.unitId" class="input-field">
              <option value="">
                —
              </option>
              <option v-for="u in unitData?.data || []" :key="u.id" :value="u.id">
                {{ u.nama }}
              </option>
            </select>
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Instansi Tujuan</label>
            <select v-model="form.tujuanInstansiId" class="input-field">
              <option value="">
                —
              </option>
              <option v-for="i in instansiData?.data || []" :key="i.id" :value="i.id">
                {{ i.nama }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Penerima</label>
            <input v-model="form.penerima" class="input-field">
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Jabatan</label>
            <input v-model="form.penerimaJabatan" class="input-field">
          </div>
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Alamat</label>
            <input v-model="form.penerimaAlamat" class="input-field">
          </div>
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Isi Surat</label>
          <textarea v-model="form.isiSurat" rows="8" class="input-field h-auto py-2.5" />
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Catatan Internal</label>
          <textarea v-model="form.catatanInternal" rows="2" class="input-field h-auto py-2.5" />
        </div>
        <div class="flex flex-wrap gap-2 justify-end">
          <UiButton variant="tertiary" :disabled="busy" @click="editing = false">
            Batal
          </UiButton>
          <UiButton variant="secondary" :disabled="busy" @click="save('draft')">
            Simpan
          </UiButton>
          <UiButton :disabled="busy" @click="save('submit')">
            Simpan & Ajukan
          </UiButton>
        </div>
      </section>
    </template>

    <template v-else-if="surat">
      <section class="card-base space-y-4">
        <h2 class="text-title-md text-ink">
          Detail Surat
        </h2>
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          <div class="border-b border-hairline-soft pb-3">
            <dt class="text-caption text-muted">
              Penerima
            </dt>
            <dd class="text-body-sm text-ink mt-0.5">
              {{ surat.penerima || '—' }}
            </dd>
          </div>
          <div class="border-b border-hairline-soft pb-3">
            <dt class="text-caption text-muted">
              Instansi Tujuan
            </dt>
            <dd class="text-body-sm text-ink mt-0.5">
              {{ surat.tujuanInstansi?.nama || '—' }}
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
              Unit Pengirim
            </dt>
            <dd class="text-body-sm text-ink mt-0.5">
              {{ surat.unit?.nama || '—' }}
            </dd>
          </div>
          <div class="border-b border-hairline-soft pb-3">
            <dt class="text-caption text-muted">
              Template
            </dt>
            <dd class="text-body-sm text-ink mt-0.5">
              {{ surat.template?.nama || '—' }}
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
          <div class="border-b border-hairline-soft pb-3 sm:col-span-2">
            <dt class="text-caption text-muted">
              Isi Surat
            </dt>
            <dd class="text-body-sm text-ink mt-0.5 whitespace-pre-wrap">
              {{ surat.isiSurat || '—' }}
            </dd>
          </div>
          <div v-if="surat.catatanInternal" class="border-b border-hairline-soft pb-3 sm:col-span-2">
            <dt class="text-caption text-muted">
              Catatan Internal
            </dt>
            <dd class="text-body-sm text-ink mt-0.5 whitespace-pre-wrap">
              {{ surat.catatanInternal }}
            </dd>
          </div>
        </dl>
      </section>

      <section v-if="surat.template || surat.isiSurat" class="card-base space-y-3">
        <h2 class="text-title-md text-ink">
          Pratinjau Template
        </h2>
        <div
          class="rounded-lg border border-hairline bg-white p-6 text-body-sm text-ink whitespace-pre-wrap"
          v-text="rendered?.html"
        />
      </section>

      <section class="card-base space-y-4">
        <h2 class="text-title-md text-ink">
          Lampiran
        </h2>
        <p v-if="actionError" class="text-body-sm text-error">
          {{ actionError }}
        </p>
        <div v-if="!surat.lampiran?.length" class="text-body-sm text-steel">
          Tidak ada lampiran
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="file in surat.lampiran"
            :key="file.id"
            class="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-hairline-soft last:border-0"
          >
            <div class="min-w-0">
              <p class="text-body-sm text-ink truncate">
                {{ file.namaFile }}
              </p>
              <p class="text-caption text-muted">
                {{ formatBytes(file.ukuran) }}
              </p>
            </div>
            <div class="flex gap-2">
              <UiButton
                v-if="canPreview(file)"
                variant="tertiary"
                @click="openPreview(file)"
              >
                <Eye class="w-4 h-4" />
                Lihat
              </UiButton>
              <UiButton
                variant="secondary"
                :disabled="!fileAvailable(file)"
                @click="downloadFile(file)"
              >
                <Download class="w-4 h-4" />
                Unduh
              </UiButton>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <UiFilePreview
      :open="previewOpen"
      :file="previewFile"
      @close="previewOpen = false"
    />

    <UiConfirmDialog
      :open="rejectOpen"
      title="Tolak surat keluar?"
      description="Surat dikembalikan ke status ditolak agar dapat diperbaiki."
      confirm-label="Tolak"
      :loading="busy"
      @close="rejectOpen = false"
      @confirm="reject"
    >
      <label class="block text-caption-bold text-steel mb-1.5">Alasan (opsional)</label>
      <textarea v-model="rejectCatatan" rows="3" class="input-field h-auto py-2.5" placeholder="Catatan penolakan..." />
    </UiConfirmDialog>
  </div>
</template>
