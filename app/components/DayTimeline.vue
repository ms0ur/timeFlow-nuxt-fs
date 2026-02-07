<script setup lang="ts">
interface TimeSlot {
    hour: number
    duration: number
    activities: Array<{
        activityId: number
        name: string
        color: string
        duration: number
    }>
}

interface Props {
    slots: TimeSlot[]
    date?: Date
}

const props = withDefaults(defineProps<Props>(), {
    date: () => new Date()
})

// Hours to display (6 AM to 11 PM)
const displayHours = computed(() => {
    const hours: number[] = []
    for (let h = 6; h <= 23; h++) {
        hours.push(h)
    }
    return hours
})

// Get max duration for scaling
const maxDuration = computed(() => {
    return Math.max(...props.slots.map(s => s.duration), 3600000) // At least 1 hour
})

function getSlotForHour(hour: number): TimeSlot | undefined {
    return props.slots.find(s => s.hour === hour)
}

function formatHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`
}

function formatDuration(ms: number): string {
    const totalMinutes = Math.floor(ms / 60000)
    if (totalMinutes < 60) {
        return `${totalMinutes}m`
    }
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}
</script>

<template>
    <div class="space-y-1">
        <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-muted">Day Timeline</h4>
            <span class="text-xs text-muted">
                {{ date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }}
            </span>
        </div>

        <div class="space-y-0.5">
            <div
                v-for="hour in displayHours"
                :key="hour"
                class="flex items-center gap-2 group"
            >
                <!-- Hour label -->
                <span class="text-xs text-muted w-10 text-right">{{ formatHour(hour) }}</span>

                <!-- Bar container -->
                <div class="flex-1 h-6 bg-gray-800/50 rounded overflow-hidden relative">
                    <template v-if="getSlotForHour(hour)">
                        <!-- Stacked activity bars -->
                        <div class="flex h-full">
                            <div
                                v-for="(activity, idx) in getSlotForHour(hour)?.activities"
                                :key="idx"
                                class="h-full transition-all duration-300"
                                :style="{
                                    width: `${(activity.duration / maxDuration) * 100}%`,
                                    backgroundColor: activity.color
                                }"
                                :title="`${activity.name}: ${formatDuration(activity.duration)}`"
                            />
                        </div>
                        
                        <!-- Duration label on hover -->
                        <div class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {{ formatDuration(getSlotForHour(hour)?.duration || 0) }}
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>
