<script setup>
const { can } = useRBAC()
const isOps = computed(() => can('registrasi_surat'))

const { data, pending } = await useFetch('/api/dashboard/stats')

const stats = computed(() => data.value?.data?.stats)
const recent = computed(() => data.value?.data?.recent || [])
</script>

<template>
  <DashboardAdminHome
    v-if="isOps"
    :stats="stats"
    :recent="recent"
    :pending="pending"
  />
  <DashboardUnitHome
    v-else
    :stats="stats"
    :recent="recent"
    :pending="pending"
  />
</template>
