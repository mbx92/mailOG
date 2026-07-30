<script setup>
defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  total: { type: Number, required: true },
  limit: { type: Number, required: true },
})

defineEmits(['update:page'])
</script>

<template>
  <div class="flex items-center justify-between gap-4 py-3 text-caption text-steel">
    <p>
      Halaman {{ page }} dari {{ totalPages || 1 }}, menampilkan
      {{ Math.min(limit, total) }} dari {{ total }}
    </p>
    <div class="flex gap-2">
      <UiButton
        variant="tertiary"
        :disabled="page <= 1"
        @click="$emit('update:page', page - 1)"
      >
        Sebelumnya
      </UiButton>
      <UiButton
        variant="tertiary"
        :disabled="page >= totalPages"
        @click="$emit('update:page', page + 1)"
      >
        Selanjutnya
      </UiButton>
    </div>
  </div>
</template>
