<script setup lang="ts">
const { $pwa } = useNuxtApp()
const toast = useToast()

onMounted(() => {
  if ($pwa?.offlineReady) {
    toast.add({
      title: 'App ready to work offline',
      color: 'success'
    })
  }
})
</script>

<template>
  <div
    v-show="$pwa?.needRefresh"
    class="fixed bottom-4 right-4 z-50 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
  >
    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium">
        New content available
      </span>
      <UButton
        size="sm"
        @click="$pwa?.updateServiceWorker()"
      >
        Refresh
      </UButton>
    </div>
  </div>
</template>
