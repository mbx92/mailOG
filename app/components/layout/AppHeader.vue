<script setup>
import { LogOut, Menu } from '@lucide/vue'

const { user, logout } = useAuth()
defineEmits(['toggle-sidebar'])
</script>

<template>
  <header class="sticky top-0 z-30 bg-canvas border-b border-hairline-soft h-14 flex items-center px-4 lg:px-6 gap-4">
    <button type="button" class="btn-icon lg:hidden" @click="$emit('toggle-sidebar')">
      <Menu class="w-4 h-4" />
    </button>

    <div class="flex-1" />

    <LayoutNotificationBell />

    <div class="flex items-center gap-3 pl-2 border-l border-hairline-soft">
      <div class="text-right hidden sm:block">
        <p class="text-body-sm font-medium text-ink leading-tight">
          {{ user?.nama }}
        </p>
        <p class="text-micro text-steel">
          {{ user?.jabatan || user?.email }}
        </p>
      </div>
      <div class="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-caption-bold font-semibold">
        {{ (user?.nama || 'U').charAt(0).toUpperCase() }}
      </div>
      <button type="button" class="btn-icon" title="Keluar" @click="logout">
        <LogOut class="w-4 h-4" />
      </button>
    </div>
  </header>
</template>
