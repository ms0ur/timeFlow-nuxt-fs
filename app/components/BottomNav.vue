<script setup lang="ts">
const route = useRoute()

const items = [
  {
    label: 'Active',
    icon: 'i-lucide-play-circle',
    to: '/active'
  },
  {
    label: 'Emotions',
    icon: 'i-lucide-heart',
    to: '/emotions'
  },
  {
    label: 'Activities',
    icon: 'i-lucide-folder-tree',
    to: '/activities'
  },
  {
    label: 'Stats',
    icon: 'i-lucide-bar-chart-3',
    to: '/stats'
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings'
  }
]
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-default bg-default/80 backdrop-blur-lg safe-area-inset-bottom">
    <div class="flex items-center justify-around py-2">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors"
        :class="[
          route.path === item.to
            ? 'text-primary bg-primary/10'
            : 'text-muted hover:text-default hover:bg-elevated'
        ]"
      >
        <UIcon :name="item.icon" class="w-6 h-6" />
        <span class="text-xs font-medium">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
