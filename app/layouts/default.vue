<script setup lang="ts">
// Initialize composables on client
if (import.meta.client) {
  const { init: initAuth, fetchUser } = useAuth()
  const { init: initTimer } = useTimer()
  const { init: initActivities } = useActivities()
  const { init: initSync } = useSync()
  const { init: initAccentColor } = useAccentColor()

  // Fetch user first, then init other composables
  onMounted(async () => {
    await fetchUser()
    initSync()
    initActivities()
    initTimer()
    initAccentColor()
  })
}
</script>

<template>
  <div class="min-h-screen bg-default pb-20">
    <slot />
    <BottomNav />
  </div>
</template>
