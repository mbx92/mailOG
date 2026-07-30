<script setup>
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const props = defineProps({
  labels: { type: Array, default: () => [] },
  values: { type: Array, default: () => [] },
  label: { type: String, default: 'Jumlah' },
  color: { type: String, default: '#ff5530' },
  heightClass: { type: String, default: 'h-56' },
})

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = Number.parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      label: props.label,
      data: props.values,
      borderColor: props.color,
      backgroundColor: withAlpha(props.color, 0.12),
      pointBackgroundColor: props.color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1a1a',
      padding: 10,
      cornerRadius: 8,
      titleFont: { size: 12 },
      bodyFont: { size: 12 },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#737373',
        font: { size: 11, family: 'DM Sans' },
      },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        color: '#737373',
        font: { size: 11, family: 'DM Sans' },
      },
      grid: { color: '#eee' },
      border: { display: false },
    },
  },
}
</script>

<template>
  <ClientOnly>
    <div :class="heightClass">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <template #fallback>
      <div :class="[heightClass, 'flex items-center justify-center text-body-sm text-steel']">
        Memuat grafik...
      </div>
    </template>
  </ClientOnly>
</template>
