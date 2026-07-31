<script setup>
import { Plus, Pencil, Trash2, Upload, ImageIcon, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { renderSuratKeluarHtml, templateAssetUrl } from '~/utils/template-render'

const { can } = useRBAC()
if (!can('buat_surat')) {
  await navigateTo('/disposisi')
}

const q = ref('')
const page = ref(1)
const showForm = ref(false)
const editingId = ref(null)
const loading = ref(false)
const deleteOpen = ref(false)
const deleteId = ref(null)
const deleteBusy = ref(false)
const uploading = ref(null)

const PLACEHOLDERS = [
  '{{nomor_surat}}', '{{tanggal}}', '{{perihal}}', '{{penerima}}',
  '{{penerima_jabatan}}', '{{penerima_alamat}}', '{{isi_surat}}',
  '{{pengirim_nama}}', '{{pengirim_jabatan}}',
]

const emptyForm = () => ({
  nama: '',
  kode: '',
  kopSurat: '',
  bodyTemplate: 'Dengan hormat,\n\n{{isi_surat}}\n\nDemikian disampaikan, atas perhatiannya diucapkan terima kasih.\n\nHormat kami,\n{{pengirim_nama}}\n{{pengirim_jabatan}}',
  footer: '',
  kertas: 'a4',
  unitId: '',
  isDefault: false,
  marginTop: 20,
  marginRight: 20,
  marginBottom: 20,
  marginLeft: 25,
  kopImage: null,
  footerImage: null,
})

const form = reactive(emptyForm())
const pendingKop = ref(null)
const pendingFooter = ref(null)
const pendingKopUrl = ref(null)
const pendingFooterUrl = ref(null)
const kopInput = ref(null)
const footerInput = ref(null)

const [{ data, pending, refresh }, { data: unitData }] = await Promise.all([
  useFetch('/api/template', {
    query: computed(() => ({
      q: q.value || undefined,
      page: page.value,
      limit: 20,
    })),
    watch: [q, page],
  }),
  useFetch('/api/unit', { lazy: true, server: false }),
])

const rows = computed(() => data.value?.data || [])
const meta = computed(() => data.value?.meta || { page: 1, totalPages: 1, total: 0, limit: 20 })

watch(q, () => { page.value = 1 })

const kopPreviewUrl = computed(() => {
  if (pendingKopUrl.value) return pendingKopUrl.value
  if (editingId.value && form.kopImage) return templateAssetUrl(editingId.value, 'kop')
  return null
})

const footerPreviewUrl = computed(() => {
  if (pendingFooterUrl.value) return pendingFooterUrl.value
  if (editingId.value && form.footerImage) return templateAssetUrl(editingId.value, 'footer')
  return null
})

const livePreview = computed(() => {
  const fakeTemplate = {
    id: editingId.value,
    kopSurat: form.kopSurat,
    bodyTemplate: form.bodyTemplate,
    footer: form.footer,
    kopImage: form.kopImage,
    footerImage: form.footerImage,
    margin: {
      top: Number(form.marginTop) || 20,
      right: Number(form.marginRight) || 20,
      bottom: Number(form.marginBottom) || 20,
      left: Number(form.marginLeft) || 25,
    },
    kertas: form.kertas,
  }
  return renderSuratKeluarHtml(fakeTemplate, {
    nomorSurat: '001 / UNIT / 07 / 2026',
    perihal: 'Contoh perihal surat',
    penerima: 'Direktur Contoh',
    penerimaJabatan: 'Direktur Utama',
    penerimaAlamat: 'Jl. Contoh No. 1',
    isiSurat: '<p>Isi surat contoh untuk pratinjau template.</p><p>Paragraf kedua.</p>',
    tanggalSurat: '2026-07-31',
  }, {
    tanggalFormatted: '31 Jul 2026',
    pengirimNama: 'Nama Pengirim',
    pengirimJabatan: 'Sekretaris',
    kopImageUrl: kopPreviewUrl.value,
    footerImageUrl: footerPreviewUrl.value,
  })
})

function revokePending(urlRef) {
  if (urlRef.value) {
    URL.revokeObjectURL(urlRef.value)
    urlRef.value = null
  }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  pendingKop.value = null
  pendingFooter.value = null
  revokePending(pendingKopUrl)
  revokePending(pendingFooterUrl)
  showForm.value = true
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, {
    nama: row.nama || '',
    kode: row.kode || '',
    kopSurat: row.kopSurat || '',
    bodyTemplate: row.bodyTemplate || '',
    footer: row.footer || '',
    kertas: row.kertas || 'a4',
    unitId: row.unitId || '',
    isDefault: Boolean(row.isDefault),
    marginTop: row.margin?.top ?? 20,
    marginRight: row.margin?.right ?? 20,
    marginBottom: row.margin?.bottom ?? 20,
    marginLeft: row.margin?.left ?? 25,
    kopImage: row.kopImage || null,
    footerImage: row.footerImage || null,
  })
  pendingKop.value = null
  pendingFooter.value = null
  revokePending(pendingKopUrl)
  revokePending(pendingFooterUrl)
  showForm.value = true
}

function onPickImage(type, e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.error('File harus berupa gambar')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Maksimal 5 MB')
    return
  }
  if (type === 'kop') {
    pendingKop.value = file
    revokePending(pendingKopUrl)
    pendingKopUrl.value = URL.createObjectURL(file)
  }
  else {
    pendingFooter.value = file
    revokePending(pendingFooterUrl)
    pendingFooterUrl.value = URL.createObjectURL(file)
  }
}

function clearImage(type) {
  if (type === 'kop') {
    pendingKop.value = null
    revokePending(pendingKopUrl)
    form.kopImage = null
  }
  else {
    pendingFooter.value = null
    revokePending(pendingFooterUrl)
    form.footerImage = null
  }
}

async function uploadAsset(templateId, type, file) {
  const body = new FormData()
  body.append('file', file)
  body.append('templateId', templateId)
  body.append('type', type)
  return $fetch('/api/template/upload-asset', { method: 'POST', body })
}

async function saveTemplate() {
  loading.value = true
  try {
    const body = {
      nama: form.nama,
      kode: form.kode,
      kopSurat: form.kopSurat || null,
      bodyTemplate: form.bodyTemplate || null,
      footer: form.footer || null,
      kertas: form.kertas,
      unitId: form.unitId || null,
      isDefault: form.isDefault,
      kopImage: form.kopImage,
      footerImage: form.footerImage,
      margin: {
        top: Number(form.marginTop) || 20,
        right: Number(form.marginRight) || 20,
        bottom: Number(form.marginBottom) || 20,
        left: Number(form.marginLeft) || 25,
      },
    }

    let id = editingId.value
    if (id) {
      await $fetch(`/api/template/${id}`, { method: 'PUT', body })
    }
    else {
      const res = await $fetch('/api/template', { method: 'POST', body })
      id = res.data.id
      editingId.value = id
    }

    if (pendingKop.value) {
      uploading.value = 'kop'
      const up = await uploadAsset(id, 'kop', pendingKop.value)
      form.kopImage = up.data.path
      pendingKop.value = null
      revokePending(pendingKopUrl)
    }
    if (pendingFooter.value) {
      uploading.value = 'footer'
      const up = await uploadAsset(id, 'footer', pendingFooter.value)
      form.footerImage = up.data.path
      pendingFooter.value = null
      revokePending(pendingFooterUrl)
    }

    toast.success('Template disimpan')
    showForm.value = false
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal menyimpan template')
  }
  finally {
    loading.value = false
    uploading.value = null
  }
}

function askDelete(id) {
  deleteId.value = id
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteId.value) return
  deleteBusy.value = true
  try {
    await $fetch(`/api/template/${deleteId.value}`, { method: 'DELETE' })
    toast.success('Template dihapus')
    deleteOpen.value = false
    deleteId.value = null
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal menghapus')
  }
  finally {
    deleteBusy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 class="text-display-md text-ink tracking-tight">
          Template Surat
        </h1>
        <p class="text-body-sm text-steel mt-1">
          Kop gambar, body, dan footer untuk surat keluar
        </p>
      </div>
      <UiButton @click="openCreate">
        <Plus class="w-4 h-4" />
        Tambah Template
      </UiButton>
    </div>

    <div class="max-w-sm">
      <UiSearchPill v-model="q" placeholder="Cari nama atau kode..." />
    </div>

    <div class="card-base !p-0 overflow-hidden">
      <div class="overflow-x-auto">
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
                Aset
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Default
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td colspan="5" class="px-4 py-10 text-center text-body-sm text-steel">
                Memuat...
              </td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="5" class="px-4 py-10 text-center text-body-sm text-steel">
                Belum ada template. Buat template pertama.
              </td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="border-t border-hairline-soft"
            >
              <td class="px-4 py-3 text-body-sm font-medium text-ink">
                {{ row.kode }}
              </td>
              <td class="px-4 py-3 text-body-sm text-charcoal">
                {{ row.nama }}
              </td>
              <td class="px-4 py-3 text-caption text-steel">
                <span v-if="row.kopImage">Kop</span>
                <span v-if="row.kopImage && row.footerImage"> · </span>
                <span v-if="row.footerImage">Footer</span>
                <span v-if="!row.kopImage && !row.footerImage">—</span>
              </td>
              <td class="px-4 py-3">
                <span v-if="row.isDefault" class="badge-success">Default</span>
                <span v-else class="text-body-sm text-muted">—</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <UiButton variant="tertiary" @click="openEdit(row)">
                    <Pencil class="w-3.5 h-3.5" />
                    Edit
                  </UiButton>
                  <UiButton variant="tertiary" @click="askDelete(row.id)">
                    <Trash2 class="w-3.5 h-3.5" />
                  </UiButton>
                </div>
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

    <UiSlidePanel
      :open="showForm"
      :title="editingId ? 'Edit Template' : 'Template Baru'"
      wide
      @close="showForm = false"
    >
      <form class="space-y-4" @submit.prevent="saveTemplate">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Nama</label>
            <input v-model="form.nama" required class="input-field" placeholder="Surat resmi">
          </div>
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Kode</label>
            <input v-model="form.kode" required class="input-field" placeholder="RESMI">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Kertas</label>
            <select v-model="form.kertas" class="input-field">
              <option value="a4">
                A4
              </option>
              <option value="folio">
                Folio
              </option>
              <option value="legal">
                Legal
              </option>
            </select>
          </div>
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Unit (opsional)</label>
            <select v-model="form.unitId" class="input-field">
              <option value="">
                Global
              </option>
              <option v-for="u in unitData?.data || []" :key="u.id" :value="u.id">
                {{ u.nama }}
              </option>
            </select>
          </div>
        </div>
        <label class="flex items-center gap-2 text-body-sm text-ink">
          <input v-model="form.isDefault" type="checkbox" class="rounded border-hairline">
          Jadikan template default
        </label>

        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Gambar kop surat</label>
          <input ref="kopInput" type="file" accept="image/*" class="hidden" @change="onPickImage('kop', $event)">
          <div v-if="kopPreviewUrl" class="relative rounded-lg border border-hairline overflow-hidden mb-2 bg-white">
            <img :src="kopPreviewUrl" alt="Kop" class="w-full max-h-28 object-contain">
            <button type="button" class="btn-icon absolute top-2 right-2 bg-canvas" @click="clearImage('kop')">
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
          <UiButton variant="secondary" type="button" @click="kopInput?.click()">
            <Upload class="w-4 h-4" />
            {{ kopPreviewUrl ? 'Ganti gambar kop' : 'Upload gambar kop' }}
          </UiButton>
          <textarea
            v-model="form.kopSurat"
            rows="2"
            class="input-field h-auto py-2.5 mt-2 text-caption"
            placeholder="Teks kop alternatif (opsional jika sudah upload gambar)"
          />
        </div>

        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Body template</label>
          <p class="text-caption text-muted mb-1.5">
            Placeholder:
            <span v-for="p in PLACEHOLDERS" :key="p" class="badge-code mr-1">{{ p }}</span>
          </p>
          <textarea v-model="form.bodyTemplate" rows="8" class="input-field h-auto py-2.5 font-mono text-caption" />
        </div>

        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Gambar footer</label>
          <input ref="footerInput" type="file" accept="image/*" class="hidden" @change="onPickImage('footer', $event)">
          <div v-if="footerPreviewUrl" class="relative rounded-lg border border-hairline overflow-hidden mb-2 bg-white">
            <img :src="footerPreviewUrl" alt="Footer" class="w-full max-h-20 object-contain">
            <button type="button" class="btn-icon absolute top-2 right-2 bg-canvas" @click="clearImage('footer')">
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
          <UiButton variant="secondary" type="button" @click="footerInput?.click()">
            <ImageIcon class="w-4 h-4" />
            {{ footerPreviewUrl ? 'Ganti gambar footer' : 'Upload gambar footer' }}
          </UiButton>
          <textarea
            v-model="form.footer"
            rows="2"
            class="input-field h-auto py-2.5 mt-2 text-caption"
            placeholder="Teks footer alternatif (opsional)"
          />
        </div>

        <div class="grid grid-cols-4 gap-2">
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Margin atas</label>
            <input v-model.number="form.marginTop" type="number" class="input-field" min="0">
          </div>
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Kanan</label>
            <input v-model.number="form.marginRight" type="number" class="input-field" min="0">
          </div>
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Bawah</label>
            <input v-model.number="form.marginBottom" type="number" class="input-field" min="0">
          </div>
          <div>
            <label class="block text-caption-bold text-steel mb-1.5">Kiri</label>
            <input v-model.number="form.marginLeft" type="number" class="input-field" min="0">
          </div>
        </div>

        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Pratinjau</label>
          <UiLetterPreview :rendered="livePreview" />
        </div>
      </form>
      <template #footer>
        <UiButton variant="tertiary" @click="showForm = false">
          Batal
        </UiButton>
        <UiButton :disabled="loading || !!uploading" @click="saveTemplate">
          {{ uploading ? `Upload ${uploading}...` : loading ? 'Menyimpan...' : 'Simpan' }}
        </UiButton>
      </template>
    </UiSlidePanel>

    <UiConfirmDialog
      :open="deleteOpen"
      title="Hapus template?"
      description="Template dihapus (soft delete) dan tidak lagi muncul di daftar."
      confirm-label="Hapus"
      :loading="deleteBusy"
      @close="deleteOpen = false"
      @confirm="confirmDelete"
    />
  </div>
</template>
