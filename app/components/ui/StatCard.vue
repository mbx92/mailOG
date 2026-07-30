<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  accent: { type: String, default: 'ink' },
  to: { type: String, default: '' },
})

const accentMap = {
  coral: 'bg-brand-coral',
  blue: 'bg-brand-blue',
  purple: 'bg-brand-purple',
  ink: 'bg-primary',
}
</script>

<template>
  <component
    :is="to ? 'NuxtLink' : 'div'"
    :to="to || undefined"
    class="card-base relative overflow-hidden block"
    :class="to ? 'hover:border-ink/30 transition-colors' : ''"
  >
    <div
      class="absolute left-0 top-0 h-full w-1.5"
      :class="accentMap[accent || 'ink']"
    />
    <p class="text-body-sm text-steel pl-3">
      {{ label }}
    </p>
    <p class="text-display-md text-ink tracking-tight pl-3 mt-1">
      {{ value }}
    </p>
    <p v-if="hint" class="text-caption text-muted pl-3 mt-2">
      {{ hint }}
    </p>
  </component>
</template>
