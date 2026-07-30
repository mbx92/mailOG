<script setup>
import { formatDate, STATUS_SURAT_MASUK } from '~/utils/formatters'
import { Inbox, Bell, ArrowRight } from '@lucide/vue'

defineProps({
  stats: { type: Object, default: () => ({}) },
  recent: { type: Array, default: () => [] },
  pending: { type: Boolean, default: false },
})
</script>

<template>
  <div class="space-y-8">
    <div class="rounded-2xl border border-hairline bg-gradient-to-br from-surface via-canvas to-canvas p-6 sm:p-8">
      <p class="text-caption-bold text-steel uppercase tracking-wide">
        Workspace unit
      </p>
      <h1 class="text-display-md text-ink tracking-tight mt-1">
        Inbox unit Anda
      </h1>
      <p class="text-body-sm text-steel mt-2 max-w-xl">
        Surat yang didisposisikan sekretariat ke unit Anda muncul di sini. Buka, baca instruksi, lalu tindak lanjuti.
      </p>
      <div class="flex flex-wrap gap-3 mt-5">
        <NuxtLink to="/surat-masuk" class="btn-primary">
          Buka inbox
          <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </div>
    </div>

    <div v-if="pending" class="text-body-sm text-steel">
      Memuat...
    </div>

    <div v-else class="grid sm:grid-cols-2 gap-4">
      <NuxtLink
        to="/surat-masuk"
        class="card-base !p-5 hover:border-ink/25 transition-colors block"
      >
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-brand-coral/15 text-brand-coral flex items-center justify-center">
            <Inbox class="w-5 h-5" />
          </div>
          <div>
            <p class="text-body-sm text-steel">
              Surat di inbox
            </p>
            <p class="text-display-sm text-ink tracking-tight mt-0.5">
              {{ stats?.suratMasuk ?? 0 }}
            </p>
          </div>
        </div>
      </NuxtLink>
      <NuxtLink
        to="/surat-masuk"
        class="card-base !p-5 hover:border-ink/25 transition-colors block"
      >
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-brand-purple/15 text-brand-purple flex items-center justify-center">
            <Bell class="w-5 h-5" />
          </div>
          <div>
            <p class="text-body-sm text-steel">
              Perlu ditindaklanjuti
            </p>
            <p class="text-display-sm text-ink tracking-tight mt-0.5">
              {{ stats?.disposisiPending ?? 0 }}
            </p>
          </div>
        </div>
      </NuxtLink>
    </div>

    <section class="card-base">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-title-md text-ink">
          Baru masuk ke unit
        </h2>
        <NuxtLink to="/surat-masuk" class="btn-link text-steel">
          Semua
        </NuxtLink>
      </div>
      <ul v-if="recent.length" class="divide-y divide-hairline-soft">
        <li v-for="row in recent" :key="row.id" class="py-3 first:pt-0 last:pb-0">
          <NuxtLink :to="`/surat-masuk/${row.id}`" class="block group">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-body-sm font-medium text-ink group-hover:underline truncate">
                  {{ row.perihal }}
                </p>
                <p class="text-caption text-steel mt-0.5">
                  {{ row.nomorSurat }} · {{ row.asalInstansi?.nama || row.pengirim || '—' }}
                </p>
              </div>
              <span :class="STATUS_SURAT_MASUK[row.status]?.class || 'badge-muted'">
                {{ STATUS_SURAT_MASUK[row.status]?.label || row.status }}
              </span>
            </div>
            <p class="text-micro text-muted mt-1">
              {{ formatDate(row.tanggalDiterima) }}
            </p>
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="text-body-sm text-steel py-6 text-center">
        Belum ada surat didisposisi ke unit Anda
      </p>
    </section>
  </div>
</template>
