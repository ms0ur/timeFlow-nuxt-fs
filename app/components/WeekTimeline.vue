<script setup lang="ts">
interface DayData {
    date: Date
    totalDuration: number
    activities: Array<{
        activityId: number
        name: string
        color: string
        duration: number
    }>
}

interface Props {
    days: DayData[]
    weekStartDay?: number // 0=Sunday, 1=Monday
}

const props = withDefaults(defineProps<Props>(), {
    weekStartDay: 1
})

const emit = defineEmits<{
    (e: 'select-day', date: Date): void
}>()

// Get max duration for scaling
const maxDuration = computed(() => {
    return Math.max(...props.days.map(d => d.totalDuration), 3600000) // At least 1 hour
})

// Day labels based on week start
const dayLabels = computed(() => {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const rotated = [...labels.slice(props.weekStartDay), ...labels.slice(0, props.weekStartDay)]
    return rotated
})

function formatDuration(ms: number): string {
    const totalMinutes = Math.floor(ms / 60000)
    if (totalMinutes < 60) {
        return `${totalMinutes}m`
    }
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

function isToday(date: Date): boolean {
    const today = new Date()
    return date.toDateString() === today.toDateString()
}

function getDayOfMonth(date: Date): number {
    return date.getDate()
}
</script>

<template>
    <div class="space-y-2">
        <h4 class="text-sm font-medium text-muted mb-3">Week Timeline</h4>

        <div class="grid grid-cols-7 gap-2">
            <!-- Day headers -->
            <div
                v-for="label in dayLabels"
                :key="label"
                class="text-xs text-center text-muted"
            >
                {{ label }}
            </div>

            <!-- Day bars -->
            <button
                v-for="day in days"
                :key="day.date.toISOString()"
                class="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-muted/10"
                :class="{ 'ring-2 ring-primary': isToday(day.date) }"
                @click="emit('select-day', day.date)"
            >
                <!-- Date number -->
                <span 
                    class="text-xs font-medium" 
                    :class="isToday(day.date) ? 'text-primary' : 'text-muted'"
                >
                    {{ getDayOfMonth(day.date) }}
                </span>

                <!-- Stacked activity bar -->
                <div class="w-full h-16 bg-gray-800/50 rounded overflow-hidden flex flex-col-reverse">
                    <div
                        v-for="(activity, idx) in day.activities"
                        :key="idx"
                        class="w-full transition-all duration-300"
                        :style="{
                            height: `${(activity.duration / maxDuration) * 100}%`,
                            backgroundColor: activity.color
                        }"
                        :title="`${activity.name}: ${formatDuration(activity.duration)}`"
                    />
                </div>

                <!-- Duration label -->
                <span class="text-xs text-muted">
                    {{ day.totalDuration > 0 ? formatDuration(day.totalDuration) : '-' }}
                </span>
            </button>
        </div>
    </div>
</template>
