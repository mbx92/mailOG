<script setup>
import { X } from '@lucide/vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  wide: { type: Boolean, default: false },
})

defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-ink/20" @click="$emit('close')" />
      <aside
        class="relative w-full bg-canvas h-full shadow-modal flex flex-col"
        :class="wide ? 'max-w-3xl' : 'max-w-md'"
      >
        <header class="flex items-center justify-between px-6 py-4 border-b border-hairline-soft">
          <h2 class="text-title-md text-ink">
            {{ title }}
          </h2>
          <button type="button" class="btn-icon" @click="$emit('close')">
            <X class="w-4 h-4" />
          </button>
        </header>
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="px-6 py-4 border-t border-hairline-soft flex gap-3 justify-end">
          <slot name="footer" />
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
