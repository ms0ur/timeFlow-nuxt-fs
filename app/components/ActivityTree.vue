<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui'
import type { ActivityNode } from '~/composables/useActivities'

const props = defineProps<{
  showTime?: boolean
}>()

const emit = defineEmits<{
  select: [activity: ActivityNode]
  edit: [activity: ActivityNode]
}>()

const { tree, isLoading } = useActivities()

// Convert ActivityNode to TreeItem format
function toTreeItems(nodes: ActivityNode[]): TreeItem[] {
  return nodes.map(node => ({
    label: node.name,
    icon: node.icon || 'i-lucide-circle',
    value: node.id.toString(),
    defaultExpanded: true,
    children: node.children.length > 0 ? toTreeItems(node.children) : undefined,
    // Store original node for access
    _node: node
  } as TreeItem & { _node: ActivityNode }))
}

const treeItems = computed(() => toTreeItems(tree.value))

function handleSelect(event: any, item: TreeItem & { _node?: ActivityNode }) {
  if (item._node) {
    emit('select', item._node)
  }
}
</script>

<template>
  <div class="w-full">
    <div v-if="isLoading" class="flex items-center justify-center p-8">
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-muted" />
    </div>

    <UTree
      v-else-if="treeItems.length > 0"
      :items="treeItems"
      class="w-full"
      @select="handleSelect"
    >
      <template #item="{ item }">
        <div class="flex items-center justify-between w-full py-1 group">
          <div class="flex items-center gap-2">
            <UIcon
              :name="item.icon || 'i-lucide-circle'"
              class="w-5 h-5"
              :style="{ color: (item as any)._node?.color || '#6366f1' }"
            />
            <span class="font-medium">{{ item.label }}</span>
          </div>

          <!-- Time display (if enabled) -->
          <div v-if="showTime && (item as any)._node?.totalDuration" class="text-sm text-muted">
            {{ formatDuration((item as any)._node.totalDuration) }}
          </div>
        </div>
      </template>
    </UTree>

    <div v-else class="text-center py-8 text-muted">
      <UIcon name="i-lucide-folder-open" class="w-12 h-12 mx-auto mb-2 opacity-50" />
      <p>No activities yet</p>
      <p class="text-sm">Create your first activity to start tracking</p>
    </div>
  </div>
</template>

<script lang="ts">
// Helper function to format duration
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
