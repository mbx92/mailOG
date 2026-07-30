<script setup>
import { Bell } from '@lucide/vue'
import { formatDate } from '~/utils/formatters'

const open = ref(false)
const root = ref(null)

const { data, refresh } = await useFetch('/api/notifikasi', {
  query: { limit: 15 },
  lazy: true,
  server: false,
})

const items = computed(() => data.value?.data || [])
const unread = computed(() => data.value?.meta?.unread ?? 0)

let timer
onMounted(() => {
  timer = setInterval(() => refresh(), 60_000)
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('click', onDocClick)
})

function onDocClick(e) {
  if (!root.value?.contains(e.target)) open.value = false
}

async function toggle() {
  open.value = !open.value
  if (open.value) await refresh()
}

async function markAllRead() {
  if (!unread.value) return
  await $fetch('/api/notifikasi/read', { method: 'POST', body: { all: true } })
  await refresh()
}

async function openItem(n) {
  if (!n.isRead) {
    await $fetch('/api/notifikasi/read', { method: 'POST', body: { ids: [n.id] } })
    await refresh()
  }
  open.value = false
    if (n.suratId) await navigateTo(`/surat-masuk/${n.suratId}`)
  else await navigateTo('/surat-masuk')
}
</script>

<template>
  <div ref="root" class="relative">
    <button type="button" class="btn-icon relative" title="Notifikasi" @click="toggle">
      <Bell class="w-4 h-4" />
      <span
        v-if="unread"
        class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-coral text-white text-[10px] font-semibold flex items-center justify-center"
      >
        {{ unread > 99 ? '99+' : unread }}
      </span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 mt-2 w-[min(100vw-2rem,22rem)] bg-canvas border border-hairline rounded-xl shadow-lg z-50 overflow-hidden"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-hairline-soft">
        <p class="text-title-md text-ink">
          Notifikasi
        </p>
        <button
          v-if="unread"
          type="button"
          class="text-caption text-steel hover:text-ink"
          @click="markAllRead"
        >
          Tandai dibaca
        </button>
      </div>

      <ul class="max-h-80 overflow-y-auto">
        <li v-if="!items.length" class="px-4 py-8 text-center text-body-sm text-steel">
          Tidak ada notifikasi
        </li>
        <li
          v-for="n in items"
          :key="n.id"
          class="border-b border-hairline-soft last:border-0"
        >
          <button
            type="button"
            class="w-full text-left px-4 py-3 hover:bg-surface transition-colors"
            :class="!n.isRead ? 'bg-surface/70' : ''"
            @click="openItem(n)"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-body-sm font-medium text-ink">
                {{ n.judul }}
              </p>
              <span v-if="!n.isRead" class="mt-1 w-2 h-2 rounded-full bg-brand-coral shrink-0" />
            </div>
            <p v-if="n.pesan" class="text-caption text-steel mt-1 line-clamp-2 whitespace-pre-line">
              {{ n.pesan }}
            </p>
            <p class="text-micro text-muted mt-1">
              {{ formatDate(n.createdAt, true) }}
              <span v-if="n.tipe" class="ml-1">· {{ n.tipe }}</span>
            </p>
          </button>
        </li>
      </ul>

      <div class="px-4 py-2 border-t border-hairline-soft">
        <NuxtLink
          to="/surat-masuk"
          class="text-caption text-steel hover:text-ink"
          @click="open = false"
        >
          Buka inbox surat →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
