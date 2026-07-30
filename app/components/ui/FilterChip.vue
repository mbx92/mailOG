<script setup>
defineProps({
  label: { type: String, required: true },
  active: { type: Boolean, default: false },
})

defineEmits(['click'])
</script>

<template>
  <button
    type="button"
    :class="active ? 'pill-tab pill-tab-active' : 'pill-tab'"
    @click="$emit('click')"
  >
    {{ label }}
  </button>
</template>
