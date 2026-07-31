<script setup>
import {
  LayoutDashboard,
  Inbox,
  Send,
  FileText,
  Building2,
  Network,
  Tags,
  Users,
  BarChart3,
  Settings,
  GitBranch,
  Hash,
  X,
} from '@lucide/vue'

const route = useRoute()
const { can, isSuperAdmin } = useRBAC()

const { data: branding } = await useFetch('/api/public/branding', {
  lazy: true,
  server: false,
})
const brandName = computed(() => branding.value?.data?.appName || 'MailOG')

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open'])

const open = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

/** Ops: Dashboard, Surat Masuk, Disposisi (monitor), Surat Keluar, Template.
 *  Unit: Dashboard + Surat Masuk (inbox hasil disposisi). */
const mainNav = computed(() => {
  const items = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/surat-masuk', label: 'Surat Masuk', icon: Inbox },
  ]

  // Admin/sekretaris: pantau status disposisi (sudah diterima unit?)
  if (can('disposisi')) {
    items.push({ to: '/disposisi', label: 'Disposisi', icon: GitBranch })
  }

  if (can('buat_surat')) {
    items.push({ to: '/surat-keluar', label: 'Surat Keluar', icon: Send })
    items.push({ to: '/template', label: 'Template Surat', icon: FileText })
  }

  return items
})

const masterNav = computed(() => {
  const items = []
  if (can('manage_instansi')) items.push({ to: '/master/instansi', label: 'Instansi', icon: Building2 })
  if (can('manage_unit')) items.push({ to: '/master/unit', label: 'Unit', icon: Network })
  if (can('manage_instansi') || can('registrasi_surat')) {
    items.push({ to: '/master/klasifikasi', label: 'Klasifikasi', icon: Tags })
  }
  if (can('buat_surat') || can('pengaturan')) {
    items.push({ to: '/master/nomor-surat', label: 'No. Surat', icon: Hash })
  }
  if (can('manage_user')) items.push({ to: '/master/users', label: 'Users', icon: Users })
  return items
})

const bottomNav = computed(() => {
  const items = []
  if (can('export')) {
    items.push({ to: '/laporan', label: 'Laporan', icon: BarChart3 })
  }
  if (isSuperAdmin.value) {
    items.push({ to: '/pengaturan', label: 'Pengaturan', icon: Settings })
  }
  return items
})

function isActive(to) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <!-- Mobile overlay -->
  <div
    v-if="open"
    class="fixed inset-0 bg-ink/30 z-40 lg:hidden"
    @click="open = false"
  />

  <aside
    class="fixed lg:sticky top-0 left-0 z-50 lg:z-20 h-screen w-[220px] bg-canvas border-r border-hairline-soft flex flex-col transition-transform duration-200"
    :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <div class="flex items-center justify-between px-5 h-14 border-b border-hairline-soft">
      <NuxtLink to="/" class="flex items-center gap-2.5 font-semibold text-ink tracking-tight text-lg min-w-0" @click="open = false">
        <UiAppLogo :size="28" />
        <span class="truncate">{{ brandName }}</span>
      </NuxtLink>
      <button type="button" class="btn-icon lg:hidden" @click="open = false">
        <X class="w-4 h-4" />
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      <div class="space-y-0.5">
        <NuxtLink
          v-for="item in mainNav"
          :key="item.to"
          :to="item.to"
          class="sidebar-nav-item"
          :class="{ 'sidebar-nav-item-active': isActive(item.to) }"
          @click="open = false"
        >
          <component :is="item.icon" class="w-4 h-4 shrink-0" />
          {{ item.label }}
        </NuxtLink>
      </div>

      <div v-if="masterNav.length">
        <p class="px-4 mb-2 text-micro text-muted uppercase tracking-wide">
          Master Data
        </p>
        <div class="space-y-0.5">
          <NuxtLink
            v-for="item in masterNav"
            :key="item.to"
            :to="item.to"
            class="sidebar-nav-item"
            :class="{ 'sidebar-nav-item-active': isActive(item.to) }"
            @click="open = false"
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0" />
            {{ item.label }}
          </NuxtLink>
        </div>
      </div>

      <div v-if="bottomNav.length" class="space-y-0.5">
        <NuxtLink
          v-for="item in bottomNav"
          :key="item.to"
          :to="item.to"
          class="sidebar-nav-item"
          :class="{ 'sidebar-nav-item-active': isActive(item.to) }"
          @click="open = false"
        >
          <component :is="item.icon" class="w-4 h-4 shrink-0" />
          {{ item.label }}
        </NuxtLink>
      </div>
    </nav>
  </aside>
</template>
