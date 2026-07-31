<script setup>
defineProps({
  size: { type: [Number, String], default: 36 },
  alt: { type: String, default: 'MailOG' },
})
</script>

<template>
  <img
    src="/logo.svg"
    :alt="alt"
    :width="size"
    :height="size"
    class="shrink-0 select-none"
    draggable="false"
  >
</template>
