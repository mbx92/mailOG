<script setup >
const { data, pending } = await useFetch('/api/klasifikasi')
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-display-md text-ink tracking-tight">
        Klasifikasi
      </h1>
      <p class="text-body-sm text-steel mt-1">
        Tingkat urgensi & klasifikasi surat
      </p>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="row in data?.data || []"
        :key="row.id"
        class="card-base"
      >
        <span
          class="inline-block w-3 h-3 rounded-full mb-3"
          :style="{ backgroundColor: row.warna }"
        />
        <p class="text-title-md text-ink">
          {{ row.nama }}
        </p>
        <p class="text-caption text-muted mt-1">
          Urutan {{ row.urutan }}
        </p>
      </div>
      <div v-if="pending" class="text-body-sm text-steel">
        Memuat...
      </div>
    </div>
  </div>
</template>
