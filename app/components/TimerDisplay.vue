<script setup lang="ts">
const { currentSession, formattedTime, elapsedMs } = useTimer()

// Current clock time
const currentTime = ref('')

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  updateClock()
  const interval = setInterval(updateClock, 1000)
  onUnmounted(() => clearInterval(interval))
})

// Pulse animation based on elapsed time
const pulseIntensity = computed(() => {
  const seconds = Math.floor(elapsedMs.value / 1000)
  return seconds % 2 === 0 ? 1 : 0.95
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-6 py-8">
    <!-- Current Clock -->
    <div class="text-muted text-lg font-medium">
      {{ currentTime }}
    </div>

    <!-- Activity Badge -->
    <div
      v-if="currentSession"
      class="flex items-center gap-2 px-4 py-2 rounded-full bg-elevated"
    >
      <UIcon
        :name="currentSession.activity.icon || 'i-lucide-circle'"
        class="w-5 h-5"
        :style="{ color: currentSession.activity.color || '#6366f1' }"
      />
      <span class="font-medium">{{ currentSession.activity.name }}</span>
    </div>

    <!-- Timer Display -->
    <div
      class="relative flex items-center justify-center w-64 h-64 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-4 border-primary/30"
      :style="{ transform: `scale(${pulseIntensity})` }"
    >
      <!-- Glow effect -->
      <div class="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" />

      <!-- Timer text -->
      <span class="relative text-5xl font-mono font-bold tracking-wider text-default">
        {{ formattedTime }}
      </span>

      <!-- Running indicator -->
      <div
        v-if="currentSession"
        class="absolute bottom-8 flex items-center gap-2 text-sm text-muted"
      >
        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>Running</span>
      </div>
    </div>

    <!-- No session message -->
    <div
      v-if="!currentSession"
      class="text-center text-muted"
    >
      <p>No active session</p>
      <p class="text-sm">Switch to an activity to start tracking</p>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
