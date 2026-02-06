<script setup lang="ts">
import type { ActivityNode } from '~/composables/useActivities'

const modelValue = defineModel<number | null>({ default: null })

const props = defineProps<{
  excludeId?: number // Exclude this activity (can't be its own parent)
}>()

const { tree, activities } = useActivities()

const isOpen = ref(false)
const searchQuery = ref('')

// Get selected activity name
const selectedActivity = computed(() => {
  if (!modelValue.value) return null
  return activities.value.find(a => a.id === modelValue.value)
})

// Filter tree based on search and exclude
const filteredTree = computed(() => {
  function filterNodes(nodes: ActivityNode[]): ActivityNode[] {
    return nodes
      .filter(node => node.id !== props.excludeId)
      .map(node => ({
        ...node,
        children: filterNodes(node.children)
      }))
      .filter(node => {
        if (!searchQuery.value.trim()) return true
        const query = searchQuery.value.toLowerCase()
        const nameMatches = node.name.toLowerCase().includes(query)
        const hasMatchingChildren = node.children.length > 0
        return nameMatches || hasMatchingChildren
      })
  }

  return filterNodes(tree.value)
})

function selectParent(activity: ActivityNode | null) {
  modelValue.value = activity?.id ?? null
  isOpen.value = false
  searchQuery.value = ''
}

function clearSelection() {
  modelValue.value = null
}

// Get path to activity for display
function getActivityPath(id: number): string {
  const parts: string[] = []
  
  function findPath(nodes: ActivityNode[], target: number): boolean {
    for (const node of nodes) {
      if (node.id === target) {
        parts.push(node.name)
        return true
      }
      if (findPath(node.children, target)) {
        parts.unshift(node.name)
        return true
      }
    }
    return false
  }
  
  findPath(tree.value, id)
  return parts.join(' → ')
}
</script>

<template>
  <div>
    <label class="block text-sm font-medium mb-2">Parent Activity</label>
    
    <!-- Selected display / trigger -->
    <button
      type="button"
      class="w-full flex items-center gap-2 p-3 rounded-lg bg-elevated hover:bg-muted/10 transition-colors text-left"
      @click="isOpen = true"
    >
      <template v-if="selectedActivity">
        <UIcon
          :name="selectedActivity.icon || 'i-lucide-circle'"
          class="w-5 h-5"
          :style="{ color: selectedActivity.color || '#6366f1' }"
        />
        <span class="flex-1 truncate">{{ getActivityPath(selectedActivity.id) }}</span>
        <button
          type="button"
          class="p-1 hover:bg-muted/20 rounded"
          @click.stop="clearSelection"
        >
          <UIcon name="i-lucide-x" class="w-4 h-4 text-muted" />
        </button>
      </template>
      <template v-else>
        <UIcon name="i-lucide-folder" class="w-5 h-5 text-muted" />
        <span class="flex-1 text-muted">No parent (root level)</span>
      </template>
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4 text-muted" />
    </button>

    <!-- Picker Modal -->
    <UModal v-model:open="isOpen" title="Select Parent Activity" :description="' '">
      <template #body>
        <div class="space-y-4">
          <!-- Search -->
          <UInput
            v-model="searchQuery"
            placeholder="Search activities..."
            icon="i-lucide-search"
            autofocus
          />

          <!-- No parent option -->
          <button
            class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors"
            :class="modelValue === null ? 'bg-primary/20 ring-2 ring-primary' : 'bg-elevated hover:bg-muted/10'"
            @click="selectParent(null)"
          >
            <UIcon name="i-lucide-folder-root" class="w-5 h-5 text-muted" />
            <span class="font-medium">No parent (root level)</span>
            <UIcon v-if="modelValue === null" name="i-lucide-check" class="w-5 h-5 text-primary ml-auto" />
          </button>

          <!-- Activity tree -->
          <div class="max-h-[50vh] overflow-y-auto border-t border-muted/20 pt-4">
            <CollapsibleActivityTree
              :activities="filteredTree"
              :selected-id="modelValue"
              :expanded-by-default="true"
              @select="selectParent"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
