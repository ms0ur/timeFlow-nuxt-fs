<script setup lang="ts">
import type { ActivityNode } from '~/composables/useActivities'

definePageMeta({
  layout: 'default'
})

const { activities, tree, createActivity, deleteActivity, updateActivity, fetchActivities } = useActivities()
const { requireAuth } = useAuth()

const toast = useToast()
const isLoading = ref(false)
const searchQuery = ref('')

onMounted(async () => {
  await requireAuth()
  await fetchActivities()
})

// Collapsible tree state
const expandedIds = ref<Set<number>>(new Set())

// Initialize all expanded
watch(tree, () => {
  if (expandedIds.value.size === 0) {
    expandAll()
  }
}, { immediate: true })

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

// Count activities
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

// Create activity modal
const showCreateModal = ref(false)
const newActivityName = ref('')
const newActivityParentId = ref<number | null>(null)
const newActivityIcon = ref('i-lucide-circle')
const newActivityColor = ref('#6366f1')

// Edit activity modal
const showEditModal = ref(false)
const editingActivity = ref<ActivityNode | null>(null)
const editName = ref('')
const editIcon = ref('')
const editColor = ref('')

// Delete confirmation
const showDeleteModal = ref(false)
const deletingActivity = ref<ActivityNode | null>(null)

const colorOptions = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6b7280'
]

async function handleCreate() {
  if (!newActivityName.value.trim()) return

  isLoading.value = true
  try {
    await createActivity({
      name: newActivityName.value.trim(),
      parentId: newActivityParentId.value,
      icon: newActivityIcon.value,
      color: newActivityColor.value
    })

    toast.add({
      title: 'Activity created!',
      color: 'success'
    })

    // Reset form
    newActivityName.value = ''
    newActivityParentId.value = null
    newActivityIcon.value = 'i-lucide-circle'
    newActivityColor.value = '#6366f1'
    showCreateModal.value = false
  } catch (error: unknown) {
    const err = error as Error
    toast.add({
      title: 'Failed to create activity',
      description: err.message,
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

function openEditModal(activity: ActivityNode) {
  editingActivity.value = activity
  editName.value = activity.name
  editIcon.value = activity.icon || 'i-lucide-circle'
  editColor.value = activity.color || '#6366f1'
  showEditModal.value = true
}

async function handleEdit() {
  if (!editingActivity.value || !editName.value.trim()) return

  isLoading.value = true
  try {
    await updateActivity(editingActivity.value.id, {
      name: editName.value.trim(),
      icon: editIcon.value,
      color: editColor.value
    })

    toast.add({
      title: 'Activity updated!',
      color: 'success'
    })

    showEditModal.value = false
    editingActivity.value = null
  } catch (error: unknown) {
    const err = error as Error
    toast.add({
      title: 'Failed to update activity',
      description: err.message,
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

function openDeleteModal(activity: ActivityNode) {
  deletingActivity.value = activity
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!deletingActivity.value) return

  isLoading.value = true
  try {
    await deleteActivity(deletingActivity.value.id)

    toast.add({
      title: 'Activity deleted',
      color: 'success'
    })

    showDeleteModal.value = false
    deletingActivity.value = null
    showEditModal.value = false
  } catch (error: unknown) {
    const err = error as Error
    toast.add({
      title: 'Failed to delete activity',
      description: err.message,
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

function handleActivitySelect(activity: ActivityNode) {
  openEditModal(activity)
}
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Activities</h1>
      <UButton
        icon="i-lucide-plus"
        label="New"
        color="primary"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Search -->
    <div class="relative mb-4">
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
    <div class="flex gap-2 text-sm mb-4">
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
    <div class="space-y-1">
      <template v-if="filteredTree.length === 0">
        <div class="text-center py-12 text-muted">
          <UIcon name="i-lucide-folder-open" class="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p v-if="searchQuery">No activities found</p>
          <template v-else>
            <p>No activities yet</p>
            <p class="text-sm">Create your first activity to start tracking</p>
          </template>
        </div>
      </template>
      <template v-else>
        <ActivitiesTreeNode
          v-for="node in filteredTree"
          :key="node.id"
          :node="node"
          :depth="0"
          :expanded-ids="expandedIds"
          @toggle="toggleExpand"
          @select="handleActivitySelect"
        />
      </template>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal" title="New Activity" :description="' '">
      <UButton
        icon="i-lucide-plus"
        label="New Activity"
        color="primary"
        class="hidden"
      />

      <template #body>
        <div class="space-y-4 max-h-[70vh] overflow-y-auto">
          <UInput
            v-model="newActivityName"
            label="Name"
            placeholder="Activity name"
            autofocus
          />

          <!-- Parent Activity Picker -->
          <ParentActivityPicker v-model="newActivityParentId" />

          <!-- Icon Picker -->
          <IconPicker v-model="newActivityIcon" />

          <div>
            <label class="block text-sm font-medium mb-2">Color</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="color in colorOptions"
                :key="color"
                class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                :class="newActivityColor === color ? 'border-white scale-110 ring-2 ring-offset-2 ring-offset-default' : 'border-transparent'"
                :style="{ backgroundColor: color, '--tw-ring-color': color }"
                @click="newActivityColor = color"
              />
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="flex-1"
            :disabled="isLoading"
            @click="showCreateModal = false"
          />
          <UButton
            label="Create"
            color="primary"
            class="flex-1"
            :loading="isLoading"
            :disabled="!newActivityName.trim()"
            @click="handleCreate"
          />
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="showEditModal" title="Edit Activity" :description="' '">
      <UButton
        icon="i-lucide-edit"
        label="Edit Activity"
        color="primary"
        class="hidden"
      />

      <template #body>
        <div class="space-y-4 max-h-[70vh] overflow-y-auto">
          <UInput
            v-model="editName"
            label="Name"
            placeholder="Activity name"
          />

          <!-- Icon Picker -->
          <IconPicker v-model="editIcon" />

          <div>
            <label class="block text-sm font-medium mb-2">Color</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="color in colorOptions"
                :key="color"
                class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                :class="editColor === color ? 'border-white scale-110 ring-2 ring-offset-2 ring-offset-default' : 'border-transparent'"
                :style="{ backgroundColor: color, '--tw-ring-color': color }"
                @click="editColor = color"
              />
            </div>
          </div>

          <UButton
            v-if="editingActivity && !editingActivity.isDefault"
            label="Delete Activity"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            block
            @click="openDeleteModal(editingActivity!)"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="flex-1"
            :disabled="isLoading"
            @click="showEditModal = false"
          />
          <UButton
            label="Save"
            color="primary"
            class="flex-1"
            :loading="isLoading"
            :disabled="!editName.trim()"
            @click="handleEdit"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation -->
    <UModal v-model:open="showDeleteModal" title="Delete Activity?" :description="' '">
      <UButton
        icon="i-lucide-trash-2"
        label="Delete"
        color="error"
        class="hidden"
      />

      <template #body>
        <p>
          Are you sure you want to delete
          <strong>{{ deletingActivity?.name }}</strong>?
        </p>
        <p class="text-muted text-sm mt-2">
          This will also delete any child activities and associated time entries.
        </p>
      </template>

      <template #footer>
        <div class="flex gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="flex-1"
            :disabled="isLoading"
            @click="showDeleteModal = false"
          />
          <UButton
            label="Delete"
            color="error"
            class="flex-1"
            :loading="isLoading"
            @click="handleDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
