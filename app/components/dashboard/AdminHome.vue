<script setup>
import { FilePlus2, GitBranch, Inbox } from '@lucide/vue'
import { formatDate, STATUS_SURAT_MASUK } from '~/utils/formatters'

defineProps({
  stats: { type: Object, default: () => ({}) },
  recent: { type: Array, default: () => [] },
  pending: { type: Boolean, default: false },
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-start gap-3.5">
      <UiAppLogo :size="44" class="mt-0.5" />
      <div>
        <p class="text-caption-bold text-steel uppercase tracking-wide">
          Administrasi
        </p>
        <h1 class="text-display-md text-ink tracking-tight mt-1">
          Dashboard operasional
        </h1>
        <p class="text-body-sm text-steel mt-1">
          Registrasi surat, disposisi ke unit, dan pantau tindak lanjut.
        </p>
      </div>
    </div>

    <div v-if="pending" class="text-body-sm text-steel">
      Memuat...
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <UiStatCard
        label="Surat Masuk"
        :value="stats?.suratMasuk ?? 0"
        hint="Total terdaftar"
        accent="coral"
        to="/surat-masuk"
      />
      <UiStatCard
        label="Surat Keluar"
        :value="stats?.suratKeluar ?? 0"
        hint="Total terdaftar"
        accent="blue"
        to="/surat-keluar"
      />
      <UiStatCard
        label="Disposisi Pending"
        :value="stats?.disposisiPending ?? 0"
        hint="Belum ditindaklanjuti unit"
        accent="purple"
        to="/disposisi?status=diterima"
      />
      <UiStatCard
        label="Surat Baru"
        :value="stats?.suratMasukBaru ?? 0"
        hint="Belum diproses"
        accent="ink"
        to="/surat-masuk?status=baru"
      />
    </div>

    <div class="flex flex-wrap gap-3">
      <NuxtLink to="/surat-masuk/baru" class="btn-primary">
        <FilePlus2 class="w-4 h-4" />
        Registrasi surat
      </NuxtLink>
      <NuxtLink to="/disposisi?status=diterima" class="btn-secondary">
        <GitBranch class="w-4 h-4" />
        Monitor disposisi
      </NuxtLink>
      <NuxtLink to="/surat-masuk" class="btn-tertiary">
        <Inbox class="w-4 h-4" />
        Daftar surat masuk
      </NuxtLink>
    </div>

    <section class="card-base">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-title-md text-ink">
          Surat Masuk Terbaru
        </h2>
        <NuxtLink to="/surat-masuk" class="btn-link text-steel">
          Lihat semua
        </NuxtLink>
      </div>

      <div class="overflow-x-auto rounded-md border border-hairline">
        <table class="w-full text-left">
          <thead class="bg-surface">
            <tr>
              <th class="px-4 py-3 text-caption-bold text-steel font-semibold">
                Nomor
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel font-semibold">
                Perihal
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel font-semibold">
                Asal
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel font-semibold">
                Tanggal
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel font-semibold">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!recent.length">
              <td colspan="5" class="px-4 py-8 text-center text-body-sm text-steel">
                Belum ada surat masuk
              </td>
            </tr>
            <tr
              v-for="row in recent"
              :key="row.id"
              class="border-t border-hairline-soft"
            >
              <td class="px-4 py-3 text-body-sm text-ink">
                <NuxtLink :to="`/surat-masuk/${row.id}`" class="font-medium hover:underline">
                  {{ row.nomorSurat }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 text-body-sm text-charcoal">
                {{ row.perihal }}
              </td>
              <td class="px-4 py-3 text-body-sm text-steel">
                {{ row.asalInstansi?.nama || row.pengirim || '—' }}
              </td>
              <td class="px-4 py-3 text-body-sm text-steel">
                {{ formatDate(row.tanggalDiterima) }}
              </td>
              <td class="px-4 py-3">
                <span :class="STATUS_SURAT_MASUK[row.status]?.class || 'badge-muted'">
                  {{ STATUS_SURAT_MASUK[row.status]?.label || row.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
