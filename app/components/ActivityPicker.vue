<script setup lang="ts">
import type { ActivityNode } from '~/composables/useActivities'

const emit = defineEmits<{
  select: [activity: ActivityNode]
  close: []
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { activities, tree, createActivity } = useActivities()
const { currentSession } = useTimer()

const searchQuery = ref('')
const showCreateForm = ref(false)
const newActivityName = ref('')
const newActivityParentId = ref<number | null>(null)
const newActivityColor = ref('#6366f1')
const newActivityIcon = ref('i-lucide-circle')
const showIconPicker = ref(false)

// Expanded nodes tracking
const expandedIds = ref<Set<number>>(new Set())

// Initialize all expanded
onMounted(() => {
  expandAll()
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
  collectIds(tree.value)
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

// Filter tree based on search
const filteredTree = computed(() => {
  if (!searchQuery.value.trim()) {
    return tree.value
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
          children: childMatches
        })
        // Auto-expand when searching
        if (childMatches.length > 0) {
          expandedIds.value.add(node.id)
        }
      }
    }

    return result
  }

  return filterNodes(tree.value)
})

// Confirmation modal
const showConfirmModal = ref(false)
const pendingActivity = ref<ActivityNode | null>(null)

function handleActivityClick(activity: ActivityNode) {
  // Skip if already active
  if (currentSession.value?.activityId === activity.id) {
    isOpen.value = false
    return
  }

  pendingActivity.value = activity
  showConfirmModal.value = true
}

function confirmSwitch() {
  if (pendingActivity.value) {
    emit('select', pendingActivity.value)
    pendingActivity.value = null
  }
  showConfirmModal.value = false
  isOpen.value = false
}

function cancelSwitch() {
  pendingActivity.value = null
  showConfirmModal.value = false
}

async function handleCreateActivity() {
  if (!newActivityName.value.trim()) return

  try {
    const activity = await createActivity({
      name: newActivityName.value.trim(),
      parentId: newActivityParentId.value,
      color: newActivityColor.value,
      icon: newActivityIcon.value
    })

    if (activity) {
      // Auto-select the new activity - need to add children property for proper type
      const activityNode: ActivityNode = {
        ...(activity as unknown as ActivityNode),
        children: []
      }
      handleActivityClick(activityNode)
    }

    // Reset form
    resetCreateForm()
  } catch (error) {
    console.error('Failed to create activity:', error)
  }
}

function resetCreateForm() {
  newActivityName.value = ''
  newActivityParentId.value = null
  newActivityColor.value = '#6366f1'
  newActivityIcon.value = 'i-lucide-circle'
  showCreateForm.value = false
}

function handleIconSelect(icon: string) {
  newActivityIcon.value = icon
  showIconPicker.value = false
}

// Color options
const colorOptions = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6b7280'  // Gray
]

// Flatten tree for total count
function countNodes(nodes: ActivityNode[]): number {
  let count = 0
  for (const node of nodes) {
    count++
    count += countNodes(node.children)
  }
  return count
}

const totalCount = computed(() => countNodes(tree.value))
const filteredCount = computed(() => countNodes(filteredTree.value))
</script>

<template>
  <UDrawer v-model:open="isOpen" title="Switch Activity" direction="bottom">
    <UButton
      label="Switch Activity"
      icon="i-lucide-repeat"
      color="primary"
      size="lg"
      block
    />

    <template #body>
      <div class="flex flex-col gap-4 max-h-[70vh]">
        <!-- Search -->
        <div class="relative">
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

        <!-- Expand/Collapse controls -->
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

        <!-- Activity Tree -->
        <div class="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
          <template v-if="filteredTree.length === 0">
            <div class="text-center py-6 text-muted">
              <UIcon name="i-lucide-search-x" class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No activities found</p>
            </div>
          </template>
          <template v-else>
            <ActivityTreeNode
              v-for="node in filteredTree"
              :key="node.id"
              :node="node"
              :depth="0"
              :expanded-ids="expandedIds"
              :current-activity-id="currentSession?.activityId"
              @toggle="toggleExpand"
              @select="handleActivityClick"
            />
          </template>
        </div>

        <!-- Create New Activity Form -->
        <div v-if="showCreateForm" class="p-4 rounded-xl bg-elevated space-y-4 border border-muted/20">
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-lucide-plus-circle" class="w-5 h-5 text-primary" />
            <span class="font-medium">New Activity</span>
          </div>

          <UInput
            v-model="newActivityName"
            placeholder="Activity name"
            autofocus
          />

          <!-- Parent Activity Picker -->
          <ParentActivityPicker v-model="newActivityParentId" />

          <!-- Icon Selection -->
          <div>
            <label class="block text-sm font-medium mb-2">Icon</label>
            <button
              type="button"
              class="flex items-center gap-2 p-3 rounded-lg bg-default hover:bg-muted/10 transition-colors w-full"
              @click="showIconPicker = true"
            >
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center"
                :style="{ backgroundColor: `${newActivityColor}20` }"
              >
                <UIcon
                  :name="newActivityIcon"
                  class="w-5 h-5"
                  :style="{ color: newActivityColor }"
                />
              </div>
              <span class="text-sm">{{ newActivityIcon.replace('i-lucide-', '') }}</span>
              <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted ml-auto" />
            </button>
          </div>

          <!-- Color Selection -->
          <div>
            <label class="block text-sm font-medium mb-2">Color</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="color in colorOptions"
                :key="color"
                class="w-8 h-8 rounded-full border-2 transition-transform"
                :class="newActivityColor === color ? 'border-white scale-110' : 'border-transparent'"
                :style="{ backgroundColor: color }"
                @click="newActivityColor = color"
              />
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              class="flex-1"
              @click="resetCreateForm"
            />
            <UButton
              label="Create"
              color="primary"
              class="flex-1"
              :disabled="!newActivityName.trim()"
              @click="handleCreateActivity"
            />
          </div>
        </div>

        <!-- Create Button -->
        <UButton
          v-if="!showCreateForm"
          label="Create New Activity"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          size="lg"
          block
          @click="showCreateForm = true"
        />
      </div>
    </template>
  </UDrawer>

  <!-- Icon Picker Modal -->
  <IconPicker
    v-model:open="showIconPicker"
    :current-icon="newActivityIcon"
    @select="handleIconSelect"
  />

  <!-- Confirmation Modal -->
  <UModal v-model:open="showConfirmModal" title="Switch Activity?">
    <template #body>
      <div class="text-center py-4">
        <p class="text-lg mb-2">
          Switch from <strong>{{ currentSession?.activity.name || 'Idle' }}</strong>
        </p>
        <p class="text-lg">
          to <strong>{{ pendingActivity?.name }}</strong>?
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          class="flex-1"
          @click="cancelSwitch"
        />
        <UButton
          label="Switch"
          color="primary"
          class="flex-1"
          @click="confirmSwitch"
        />
      </div>
    </template>
  </UModal>
</template>
