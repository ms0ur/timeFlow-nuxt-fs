<script setup lang="ts">
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
} from 'chart.js'

// Register Chart.js components
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title)

definePageMeta({
  layout: 'default'
})

const { requireAuth } = useAuth()

onMounted(async () => {
  await requireAuth()
})

// Period selection
const periods = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' }
]

const selectedPeriod = ref('today')

// Calculate date range based on period
const dateRange = computed(() => {
  const now = new Date()
  let start: Date

  switch (selectedPeriod.value) {
    case 'week':
      start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      break
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    default: // today
      start = new Date(now)
      start.setHours(0, 0, 0, 0)
  }

  return { start, end: now }
})

// Fetch stats
const statsData = ref<{
  totalDuration: number
  sessionCount: number
  activities: Array<{
    activity: { id: number; name: string; icon: string | null; color: string | null }
    totalDuration: number
    sessionCount: number
  }>
  dailyBreakdown?: Array<{
    date: string
    totalDuration: number
    activities: Record<number, number>
  }>
} | null>(null)

async function fetchStats() {
  try {
    const data = await $fetch('/api/sessions/stats', {
      query: {
        start: dateRange.value.start.toISOString(),
        end: dateRange.value.end.toISOString()
      }
    })
    statsData.value = data as typeof statsData.value
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }
}

// Fetch on mount and period change
onMounted(() => fetchStats())
watch(selectedPeriod, () => fetchStats())

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function formatTotalDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${hours}h ${minutes}m`
}

// Doughnut chart data
const doughnutData = computed(() => {
  if (!statsData.value?.activities?.length) {
    return {
      labels: ['No data'],
      datasets: [{
        data: [1],
        backgroundColor: ['#374151'],
        borderWidth: 0
      }]
    }
  }

  return {
    labels: statsData.value.activities.map(a => a.activity.name),
    datasets: [{
      data: statsData.value.activities.map(a => a.totalDuration),
      backgroundColor: statsData.value.activities.map(a => a.activity.color || '#6366f1'),
      borderWidth: 0,
      hoverOffset: 8
    }]
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: true,
  cutout: '65%',
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context: { parsed: number; label: string }) => {
          return `${context.label}: ${formatDuration(context.parsed)}`
        }
      }
    }
  }
}

// Bar chart for daily breakdown (week/month view)
const barData = computed(() => {
  if (!statsData.value?.dailyBreakdown?.length) {
    return null
  }

  const labels = statsData.value.dailyBreakdown.map(d => {
    const date = new Date(d.date)
    return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })
  })

  return {
    labels,
    datasets: [{
      label: 'Time Tracked',
      data: statsData.value.dailyBreakdown.map(d => d.totalDuration / 3600000), // Convert to hours
      backgroundColor: '#6366f1',
      borderRadius: 6,
      maxBarThickness: 40
    }]
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context: unknown) => {
          const ctx = context as { parsed: { y: number | null } }
          return `${(ctx.parsed.y ?? 0).toFixed(1)} hours`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(255, 255, 255, 0.1)'
      },
      ticks: {
        callback: (value: unknown) => `${value}h`
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  }
}

// Heatmap data (activity hours matrix)
const heatmapData = computed(() => {
  if (!statsData.value?.dailyBreakdown?.length) return null

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const days = statsData.value.dailyBreakdown.slice(-7) // Last 7 days

  return {
    hours,
    days: days.map(d => ({
      date: new Date(d.date).toLocaleDateString('ru-RU', { weekday: 'short' }),
      totalDuration: d.totalDuration
    }))
  }
})

function getHeatmapColor(value: number, max: number): string {
  if (value === 0) return 'bg-gray-800'
  const intensity = Math.min(value / max, 1)
  if (intensity < 0.25) return 'bg-primary/20'
  if (intensity < 0.5) return 'bg-primary/40'
  if (intensity < 0.75) return 'bg-primary/60'
  return 'bg-primary/90'
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 space-y-6">
    <h1 class="text-2xl font-bold">Statistics</h1>

    <!-- Period Selector -->
    <div class="flex gap-2">
      <UButton
        v-for="period in periods"
        :key="period.value"
        :label="period.label"
        :color="selectedPeriod === period.value ? 'primary' : 'neutral'"
        :variant="selectedPeriod === period.value ? 'solid' : 'ghost'"
        size="sm"
        @click="selectedPeriod = period.value"
      />
    </div>

    <!-- Total Time Card -->
    <div class="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
      <p class="text-sm text-muted mb-1">Total Time</p>
      <p class="text-4xl font-bold text-primary">
        {{ formatTotalDuration(statsData?.totalDuration || 0) }}
      </p>
      <p class="text-sm text-muted mt-1">
        {{ statsData?.sessionCount || 0 }} sessions
      </p>
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Doughnut Chart -->
      <div class="p-6 rounded-2xl bg-elevated">
        <h3 class="text-lg font-semibold mb-4">Time Distribution</h3>
        <div class="relative aspect-square max-w-[280px] mx-auto">
          <Doughnut :data="doughnutData" :options="doughnutOptions" />
          <!-- Center text -->
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-2xl font-bold">{{ formatTotalDuration(statsData?.totalDuration || 0) }}</span>
            <span class="text-sm text-muted">Total</span>
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-4 space-y-2">
          <div
            v-for="stat in statsData?.activities?.slice(0, 5)"
            :key="stat.activity.id"
            class="flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: stat.activity.color || '#6366f1' }"
              />
              <span class="text-sm">{{ stat.activity.name }}</span>
            </div>
            <span class="text-sm text-muted">{{ formatDuration(stat.totalDuration) }}</span>
          </div>
        </div>
      </div>

      <!-- Bar Chart (Week/Month) -->
      <div v-if="barData && selectedPeriod !== 'today'" class="p-6 rounded-2xl bg-elevated">
        <h3 class="text-lg font-semibold mb-4">Daily Breakdown</h3>
        <div class="h-64">
          <Bar :data="barData" :options="barOptions" />
        </div>
      </div>

      <!-- Activity Heatmap -->
      <div v-if="heatmapData && selectedPeriod !== 'today'" class="p-6 rounded-2xl bg-elevated lg:col-span-2">
        <h3 class="text-lg font-semibold mb-4">Activity Heatmap</h3>
        <div class="overflow-x-auto">
          <div class="grid grid-cols-8 gap-1 min-w-[480px]">
            <!-- Header row -->
            <div class="text-xs text-muted" />
            <div
              v-for="day in heatmapData.days"
              :key="day.date"
              class="text-xs text-center text-muted py-1"
            >
              {{ day.date }}
            </div>

            <!-- Hour rows - simplified view -->
            <template v-for="hour in [6, 9, 12, 15, 18, 21]" :key="hour">
              <div class="text-xs text-muted text-right pr-2 py-1">{{ hour }}:00</div>
              <div
                v-for="(day, index) in heatmapData.days"
                :key="`${hour}-${index}`"
                class="h-8 rounded transition-colors"
                :class="getHeatmapColor(day.totalDuration / 4, Math.max(...heatmapData.days.map(d => d.totalDuration)))"
                :title="`${day.date} ${hour}:00 - ${formatDuration(day.totalDuration / 4)}`"
              />
            </template>
          </div>

          <!-- Heatmap legend -->
          <div class="flex items-center justify-end gap-2 mt-4 text-xs text-muted">
            <span>Less</span>
            <div class="w-4 h-4 rounded bg-gray-800" />
            <div class="w-4 h-4 rounded bg-primary/20" />
            <div class="w-4 h-4 rounded bg-primary/40" />
            <div class="w-4 h-4 rounded bg-primary/60" />
            <div class="w-4 h-4 rounded bg-primary/90" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity Breakdown List -->
    <div class="p-6 rounded-2xl bg-elevated">
      <h3 class="text-lg font-semibold mb-4">Activity Breakdown</h3>

      <div v-if="!statsData?.activities?.length" class="text-center py-8 text-muted">
        <UIcon name="i-lucide-bar-chart-3" class="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No activity data for this period</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="stat in statsData.activities"
          :key="stat.activity.id"
          class="p-4 rounded-xl bg-default/50"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center"
                :style="{ backgroundColor: `${stat.activity.color}20` }"
              >
                <UIcon
                  :name="stat.activity.icon || 'i-lucide-circle'"
                  class="w-5 h-5"
                  :style="{ color: stat.activity.color || '#6366f1' }"
                />
              </div>
              <div>
                <p class="font-medium">{{ stat.activity.name }}</p>
                <p class="text-xs text-muted">{{ stat.sessionCount }} sessions</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-semibold">{{ formatDuration(stat.totalDuration) }}</p>
              <p class="text-xs text-muted">
                {{ Math.round((stat.totalDuration / (statsData?.totalDuration || 1)) * 100) }}%
              </p>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="h-2 bg-default rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: `${(stat.totalDuration / (statsData?.totalDuration || 1)) * 100}%`,
                backgroundColor: stat.activity.color || '#6366f1'
              }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
