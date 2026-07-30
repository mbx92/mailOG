<script setup >
const sidebarOpen = ref(false)
</script>

<template>
  <div class="min-h-screen bg-surface flex">
    <LayoutAppSidebar v-model:open="sidebarOpen" />
    <div class="flex-1 flex flex-col min-w-0">
      <LayoutAppHeader @toggle-sidebar="sidebarOpen = true" />
      <main class="flex-1 p-4 lg:p-8 max-w-content w-full mx-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
