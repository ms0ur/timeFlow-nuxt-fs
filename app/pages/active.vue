<script setup lang="ts">
import type { ActivityNode } from '~/composables/useActivities'

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

definePageMeta({
  layout: 'default'
})

const { currentSession, formattedTime, elapsedMs, switchActivity, stopTracking, isTracking, init: initTimer } = useTimer()
const { activities, tree, init: initActivities } = useActivities()
const { isAuthenticated, requireAuth } = useAuth()
const { isOnline, pendingCount } = useSync()
const toast = useToast()

// Ensure user is authenticated
onMounted(async () => {
  const authed = await requireAuth()
  if (authed) {
    initActivities()
    initTimer()
    refreshStats()
  }
})

// Fetch today's stats
const statsData = ref<{ activities: ActivityStat[]; totalDuration: number } | null>(null)

async function refreshStats() {
  try {
    const data = await $fetch('/api/sessions/stats', {
      query: {
        start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        end: new Date().toISOString()
      }
    })
    statsData.value = data as typeof statsData.value
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }
}

// Activity picker drawer
const showPicker = ref(false)
const searchQuery = ref('')

// Filter activities for picker
const filteredActivities = computed(() => {
  if (!searchQuery.value.trim()) {
    return activities.value
  }
  const query = searchQuery.value.toLowerCase()
  return activities.value.filter(a =>
    a.name.toLowerCase().includes(query)
  )
})

async function handleActivitySelect(activity: ActivityNode | { id: number; name: string; icon?: string | null; color?: string | null }) {
  await switchActivity(activity.id, activity as ActivityNode)
  showPicker.value = false
  searchQuery.value = ''
  toast.add({
    title: `Switched to ${activity.name}`,
    icon: activity.icon || 'i-lucide-play',
    color: 'success'
  })
  await refreshStats()
}

// Stop tracking confirmation
const showStopModal = ref(false)
const stopConfirmStep = ref(0)

function initiateStop() {
  stopConfirmStep.value = 0
  showStopModal.value = true
}

function confirmStopStep() {
  stopConfirmStep.value++
  if (stopConfirmStep.value >= 2) {
    performStop()
  }
}

async function performStop() {
  try {
    await stopTracking()
    showStopModal.value = false
    stopConfirmStep.value = 0
    toast.add({
      title: 'Tracking stopped',
      description: 'You can resume anytime',
      icon: 'i-lucide-pause',
      color: 'warning'
    })
  } catch (error) {
    toast.add({
      title: 'Failed to stop tracking',
      color: 'error'
    })
  }
}

// Refresh stats periodically
let statsInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  statsInterval = setInterval(() => {
    refreshStats()
  }, 60000) // Every minute
})

onUnmounted(() => {
  if (statsInterval) {
    clearInterval(statsInterval)
  }
})

// Pulse animation based on elapsed time
const pulseIntensity = computed(() => {
  if (!isTracking.value) return 1
  const seconds = Math.floor(elapsedMs.value / 1000)
  return seconds % 2 === 0 ? 1 : 0.98
})

// Current time display
const currentTime = ref(new Date())
onMounted(() => {
  const timeInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)

  onUnmounted(() => clearInterval(timeInterval))
})
</script>

<template>
  <div class="container mx-auto px-4 pb-8">
    <!-- Offline indicator -->
    <div
      v-if="!isOnline"
      class="fixed top-0 left-0 right-0 bg-warning text-warning-foreground text-center py-2 text-sm z-50"
    >
      <UIcon name="i-lucide-wifi-off" class="w-4 h-4 inline mr-1" />
      Offline mode
      <span v-if="pendingCount > 0">({{ pendingCount }} pending)</span>
    </div>

    <!-- Timer Display -->
    <div class="flex flex-col items-center justify-center gap-4 py-6">
      <!-- Current Clock -->
      <div class="text-muted text-lg font-medium">
        {{ currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }}
      </div>

      <!-- Activity Badge -->
      <div
        v-if="currentSession && isTracking"
        class="flex items-center gap-2 px-4 py-2 rounded-full"
        :style="{ backgroundColor: `${currentSession.activity.color || '#22c55e'}20` }"
      >
        <UIcon
          :name="currentSession.activity.icon || 'i-lucide-circle'"
          class="w-5 h-5"
          :style="{ color: currentSession.activity.color || '#22c55e' }"
        />
        <span class="font-medium">{{ currentSession.activity.name }}</span>
      </div>

      <div
        v-else
        class="flex items-center gap-2 px-4 py-2 rounded-full bg-elevated/50"
      >
        <UIcon name="i-lucide-pause" class="w-5 h-5 text-muted" />
        <span class="font-medium text-muted">Not tracking</span>
      </div>

      <!-- Timer Display -->
      <div
        class="relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 rounded-full transition-transform duration-200"
        :class="isTracking
          ? 'bg-gradient-to-br from-primary/20 to-primary/5 border-4 border-primary/30'
          : 'bg-gradient-to-br from-gray-500/20 to-gray-500/5 border-4 border-gray-500/30'"
        :style="{ transform: `scale(${pulseIntensity})` }"
      >
        <!-- Glow effect -->
        <div
          v-if="isTracking"
          class="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse"
        />

        <!-- Timer text -->
        <span class="relative text-4xl sm:text-5xl font-mono font-bold tracking-wider text-default">
          {{ isTracking ? formattedTime : '00:00:00' }}
        </span>

        <!-- Running indicator -->
        <div
          v-if="isTracking && currentSession"
          class="absolute bottom-6 sm:bottom-8 flex items-center gap-2 text-sm text-muted"
        >
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Running</span>
        </div>

        <div
          v-else
          class="absolute bottom-6 sm:bottom-8 flex items-center gap-2 text-sm text-muted"
        >
          <span class="w-2 h-2 rounded-full bg-gray-500" />
          <span>Paused</span>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-center gap-4 mb-6">
      <!-- Switch Activity Button -->
      <UButton
        label="Switch Activity"
        icon="i-lucide-repeat"
        color="primary"
        size="lg"
        @click="showPicker = true"
      />

      <!-- Stop Button -->
      <UButton
        v-if="isTracking && currentSession"
        icon="i-lucide-pause"
        label="Stop"
        color="warning"
        size="lg"
        variant="outline"
        @click="initiateStop"
      />
    </div>

    <!-- Today's Stats -->
    <TodayTopActivities
      :stats="statsData?.activities"
      :total-duration="statsData?.totalDuration"
    />

    <!-- Activity Picker Drawer -->
    <UDrawer v-model:open="showPicker" title="Switch Activity" direction="bottom">
      <template #body>
        <div class="flex flex-col gap-4 max-h-[60vh]">
          <!-- Search -->
          <UInput
            v-model="searchQuery"
            placeholder="Search activities..."
            icon="i-lucide-search"
            size="lg"
          />

          <!-- Activity List -->
          <div class="flex-1 overflow-y-auto space-y-2 -mx-2 px-2">
            <button
              v-for="activity in filteredActivities"
              :key="activity.id"
              class="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
              :class="[
                currentSession?.activityId === activity.id
                  ? 'bg-primary/20 ring-2 ring-primary'
                  : 'bg-elevated hover:bg-muted/10'
              ]"
              @click="handleActivitySelect(activity)"
            >
              <UIcon
                :name="activity.icon || 'i-lucide-circle'"
                class="w-6 h-6 shrink-0"
                :style="{ color: activity.color || '#22c55e' }"
              />
              <div class="flex-1 text-left min-w-0">
                <p class="font-medium truncate">{{ activity.name }}</p>
                <p v-if="activity.isDefault" class="text-xs text-muted">Default</p>
              </div>
              <UIcon
                v-if="currentSession?.activityId === activity.id"
                name="i-lucide-check"
                class="w-5 h-5 text-primary shrink-0"
              />
            </button>

            <div v-if="filteredActivities.length === 0" class="text-center py-8 text-muted">
              <UIcon name="i-lucide-search-x" class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No activities found</p>
            </div>
          </div>
        </div>
      </template>
    </UDrawer>

    <!-- Stop Confirmation Modal -->
    <UModal v-model:open="showStopModal" title="Stop Tracking?" :description="' '">
      <UButton
        icon="i-lucide-pause"
        label="Stop"
        color="warning"
        class="hidden"
      />

      <template #body>
        <div class="text-center py-4">
          <template v-if="stopConfirmStep === 0">
            <UIcon name="i-lucide-alert-triangle" class="w-12 h-12 mx-auto mb-4 text-warning" />
            <p class="text-lg mb-2">Are you sure you want to stop tracking?</p>
            <p class="text-muted">
              Your current session on <strong>{{ currentSession?.activity.name }}</strong> will be saved.
            </p>
          </template>

          <template v-else-if="stopConfirmStep === 1">
            <UIcon name="i-lucide-alert-circle" class="w-12 h-12 mx-auto mb-4 text-error" />
            <p class="text-lg mb-2">Really stop?</p>
            <p class="text-muted">
              You've been tracking for <strong>{{ formattedTime }}</strong>.
              <br />
              This action cannot be undone.
            </p>
          </template>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="flex-1"
            @click="showStopModal = false; stopConfirmStep = 0"
          />
          <UButton
            :label="stopConfirmStep === 0 ? 'Yes, Stop' : 'Confirm Stop'"
            :color="stopConfirmStep === 0 ? 'warning' : 'error'"
            class="flex-1"
            @click="confirmStopStep"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
