<script setup lang="ts">
import type { ActivityNode } from '~/composables/useActivities'

const props = defineProps<{
  activities: ActivityNode[]
  selectedId?: number | null
  showSearch?: boolean
  expandedByDefault?: boolean
}>()

const emit = defineEmits<{
  select: [activity: ActivityNode]
}>()

const searchQuery = ref('')
const expandedIds = ref<Set<number>>(new Set())

// Initialize expanded state
onMounted(() => {
  if (props.expandedByDefault) {
    expandAll()
  }
})

function expandAll() {
  const ids = new Set<number>()
  function collectIds(nodes: ActivityNode[]) {
    for (const node of nodes) {
      if (node.children.length > 0) {
        ids.add(node.id)
        collectIds(node.children)
      }
    }
  }
  collectIds(props.activities)
  expandedIds.value = ids
}

function collapseAll() {
  expandedIds.value = new Set()
}

function toggleExpand(id: number) {
  const newSet = new Set(expandedIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  expandedIds.value = newSet
}

function isExpanded(id: number): boolean {
  return expandedIds.value.has(id)
}

// Filter activities based on search
const filteredTree = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.activities
  }

  const query = searchQuery.value.toLowerCase()

  function filterNodes(nodes: ActivityNode[]): ActivityNode[] {
    const result: ActivityNode[] = []

    for (const node of nodes) {
      const nameMatches = node.name.toLowerCase().includes(query)
      const childMatches = filterNodes(node.children)

      if (nameMatches || childMatches.length > 0) {
        result.push({
          ...node,
          children: childMatches.length > 0 ? childMatches : []
        })

        // Auto-expand parents of matches
        if (childMatches.length > 0) {
          expandedIds.value.add(node.id)
        }
      }
    }

    return result
  }

  return filterNodes(props.activities)
})

// Flatten for counting
function countNodes(nodes: ActivityNode[]): number {
  let count = 0
  for (const node of nodes) {
    count++
    count += countNodes(node.children)
  }
  return count
}

const totalCount = computed(() => countNodes(props.activities))
const filteredCount = computed(() => countNodes(filteredTree.value))

function selectActivity(activity: ActivityNode) {
  emit('select', activity)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Search -->
    <div v-if="showSearch" class="relative">
      <UInput
        v-model="searchQuery"
        placeholder="Search activities..."
        icon="i-lucide-search"
        size="lg"
      />
      <div v-if="searchQuery" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
        {{ filteredCount }} / {{ totalCount }}
      </div>
    </div>

    <!-- Expand/Collapse buttons -->
    <div class="flex gap-2 text-sm">
      <button
        class="text-muted hover:text-default transition-colors"
        @click="expandAll"
      >
        Expand all
      </button>
      <span class="text-muted">·</span>
      <button
        class="text-muted hover:text-default transition-colors"
        @click="collapseAll"
      >
        Collapse all
      </button>
    </div>

    <!-- Tree -->
    <div v-if="filteredTree.length === 0" class="text-center py-6 text-muted">
      <UIcon name="i-lucide-search-x" class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p>No activities found</p>
    </div>

    <div v-else class="space-y-1">
      <CollapsibleTreeNode
        v-for="node in filteredTree"
        :key="node.id"
        :node="node"
        :depth="0"
        :expanded-ids="expandedIds"
        :selected-id="selectedId"
        @toggle="toggleExpand"
        @select="selectActivity"
      />
    </div>
  </div>
</template>
