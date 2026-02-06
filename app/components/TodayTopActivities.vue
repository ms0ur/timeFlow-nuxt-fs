<script setup lang="ts">
interface ActivityStat {
  activity: {
    id: number
    name: string
    icon: string | null
    color: string | null
  }
  totalDuration: number
  sessionCount: number
}

defineProps<{
  stats?: ActivityStat[]
  totalDuration?: number
}>()

const emit = defineEmits<{
  click: [activityId: number]
}>()

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
</script>

<template>
  <div class="space-y-3">
    <h3 class="text-sm font-medium text-muted uppercase tracking-wide">
      Today's Top Activities
    </h3>

    <div v-if="!stats || stats.length === 0" class="text-center py-6 text-muted">
      <UIcon name="i-lucide-clock" class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p>No activity tracked yet today</p>
    </div>

    <div v-else class="space-y-2">
      <button
        v-for="stat in stats.slice(0, 5)"
        :key="stat.activity.id"
        class="w-full p-3 rounded-xl bg-elevated hover:bg-muted/10 transition-colors"
        @click="emit('click', stat.activity.id)"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <UIcon
              :name="stat.activity.icon || 'i-lucide-circle'"
              class="w-5 h-5"
              :style="{ color: stat.activity.color || '#6366f1' }"
            />
            <span class="font-medium">{{ stat.activity.name }}</span>
          </div>
          <span class="text-sm text-muted">{{ formatDuration(stat.totalDuration) }}</span>
        </div>

        <!-- Progress bar -->
        <div class="h-2 bg-default rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :style="{
              width: totalDuration ? `${(stat.totalDuration / totalDuration) * 100}%` : '0%',
              backgroundColor: stat.activity.color || '#6366f1'
            }"
          />
        </div>
      </button>
    </div>
  </div>
</template>
