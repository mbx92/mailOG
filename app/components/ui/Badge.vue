<script setup>
defineProps({
  variant: { type: String, default: 'muted' },
  label: { type: String, required: true },
})

const classMap = {
  success: 'badge-success',
  new: 'badge-new',
  beta: 'badge-beta',
  code: 'badge-code',
  muted: 'badge-muted',
  warning: 'badge-warning',
}
</script>

<template>
  <span :class="classMap[variant || 'muted']">{{ label }}</span>
</template>
