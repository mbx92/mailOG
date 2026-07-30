<script setup>
import { X, Download, ExternalLink } from '@lucide/vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  file: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const previewUrl = computed(() =>
  props.file?.id ? `/api/lampiran/${props.file.id}/file` : null,
)

const downloadUrl = computed(() =>
  props.file?.id ? `/api/lampiran/${props.file.id}/file?download=1` : null,
)

const kind = computed(() => {
  const mime = String(props.file?.mimeType || '').toLowerCase()
  const name = String(props.file?.namaFile || '').toLowerCase()
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name)) return 'image'
  return 'other'
})

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (!import.meta.client) return
    if (open) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
)

onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && file"
      class="fixed inset-0 z-50 flex flex-col bg-ink/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      :aria-label="`Pratinjau ${file.namaFile}`"
    >
      <header class="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 bg-canvas border-b border-hairline-soft shrink-0">
        <div class="min-w-0">
          <p class="text-title-md text-ink truncate">
            {{ file.namaFile }}
          </p>
          <p class="text-caption text-muted truncate">
            {{ file.mimeType }}
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <a
            v-if="previewUrl"
            :href="previewUrl"
            target="_blank"
            rel="noopener"
            class="btn-tertiary inline-flex items-center gap-1.5"
          >
            <ExternalLink class="w-3.5 h-3.5" />
            Tab baru
          </a>
          <a
            v-if="downloadUrl"
            :href="downloadUrl"
            class="btn-tertiary inline-flex items-center gap-1.5"
          >
            <Download class="w-3.5 h-3.5" />
            Unduh
          </a>
          <button type="button" class="btn-icon" aria-label="Tutup" @click="emit('close')">
            <X class="w-4 h-4" />
          </button>
        </div>
      </header>

      <div class="flex-1 min-h-0 bg-canvas/95 p-3 sm:p-4">
        <div class="h-full w-full max-w-6xl mx-auto rounded-xl overflow-hidden border border-hairline bg-white shadow-lg">
          <iframe
            v-if="kind === 'pdf' && previewUrl"
            :src="previewUrl"
            class="w-full h-full min-h-[70vh] border-0"
            title="Pratinjau PDF"
          />
          <div
            v-else-if="kind === 'image' && previewUrl"
            class="h-full min-h-[70vh] flex items-center justify-center bg-ink/[0.03] p-4 overflow-auto"
          >
            <img
              :src="previewUrl"
              :alt="file.namaFile"
              class="max-w-full max-h-[75vh] object-contain"
            >
          </div>
          <div
            v-else
            class="h-full min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 text-center"
          >
            <p class="text-body-sm text-steel max-w-md">
              Pratinjau tidak tersedia untuk tipe file ini. Buka di tab baru atau unduh untuk melihat isinya.
            </p>
            <div class="flex gap-2">
              <a
                v-if="previewUrl"
                :href="previewUrl"
                target="_blank"
                rel="noopener"
                class="btn-secondary"
              >
                Buka file
              </a>
              <a v-if="downloadUrl" :href="downloadUrl" class="btn-primary">
                Unduh
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
