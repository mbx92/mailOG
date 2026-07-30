<script setup>
import { Search } from '@lucide/vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Cari...' },
})

const emit = defineEmits(['update:modelValue'])

const value = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
</script>

<template>
  <div class="relative">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
    <input
      v-model="value"
      type="search"
      class="search-pill pl-9"
      :placeholder="placeholder"
    >
  </div>
</template>
