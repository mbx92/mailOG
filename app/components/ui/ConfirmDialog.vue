<script setup>
import { X } from '@lucide/vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Konfirmasi' },
  description: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Ya' },
  cancelLabel: { type: String, default: 'Batal' },
  loading: { type: Boolean, default: false },
  /** primary | danger */
  variant: { type: String, default: 'primary' },
})

const emit = defineEmits(['close', 'confirm'])

function onKey(e) {
  if (e.key === 'Escape' && !props.loading) emit('close')
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
      v-if="open"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-ink/30"
        @click="!loading && $emit('close')"
      />
      <div
        role="dialog"
        aria-modal="true"
        class="relative w-full max-w-md bg-canvas rounded-xl border border-hairline shadow-modal p-6"
      >
        <div class="flex items-start justify-between gap-3 mb-3">
          <h2 class="text-title-md text-ink">
            {{ title }}
          </h2>
          <button
            type="button"
            class="btn-icon shrink-0"
            :disabled="loading"
            @click="$emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
        <p v-if="description" class="text-body-sm text-steel">
          {{ description }}
        </p>
        <div v-if="$slots.default" class="mt-3 text-body-sm text-charcoal">
          <slot />
        </div>
        <div class="flex flex-wrap justify-end gap-2 mt-6">
          <UiButton
            variant="tertiary"
            :disabled="loading"
            @click="$emit('close')"
          >
            {{ cancelLabel }}
          </UiButton>
          <UiButton
            :variant="variant === 'danger' ? 'secondary' : 'primary'"
            :disabled="loading"
            @click="$emit('confirm')"
          >
            {{ loading ? 'Memproses...' : confirmLabel }}
          </UiButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
