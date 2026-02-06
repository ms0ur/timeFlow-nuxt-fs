<script setup lang="ts">
import type { ActivityNode } from '~/composables/useActivities'

const props = defineProps<{
  node: ActivityNode
  depth: number
  expandedIds: Set<number>
}>()

const emit = defineEmits<{
  toggle: [id: number]
  select: [activity: ActivityNode]
}>()

const hasChildren = computed(() => props.node.children.length > 0)
const isExpanded = computed(() => props.expandedIds.has(props.node.id))

function handleToggle(e: Event) {
  e.stopPropagation()
  emit('toggle', props.node.id)
}

function handleSelect() {
  emit('select', props.node)
}
</script>

<template>
  <div>
    <!-- Node row -->
    <button
      class="w-full flex items-center gap-2 p-3 rounded-xl transition-all group hover:bg-elevated"
      :style="{ paddingLeft: `${depth * 20 + 12}px` }"
      @click="handleSelect"
    >
      <!-- Expand/Collapse toggle -->
      <button
        v-if="hasChildren"
        class="w-6 h-6 flex items-center justify-center rounded hover:bg-muted/20 transition-colors shrink-0"
        @click="handleToggle"
      >
        <UIcon
          :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="w-4 h-4 text-muted"
        />
      </button>
      <div v-else class="w-6 shrink-0" />

      <!-- Activity icon -->
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        :style="{ backgroundColor: `${node.color || '#6366f1'}20` }"
      >
        <UIcon
          :name="node.icon || 'i-lucide-circle'"
          class="w-5 h-5"
          :style="{ color: node.color || '#6366f1' }"
        />
      </div>

      <!-- Name -->
      <div class="flex-1 text-left min-w-0">
        <p class="font-medium truncate">{{ node.name }}</p>
        <p v-if="node.isDefault" class="text-xs text-muted">Default activity</p>
      </div>

      <!-- Children count badge -->
      <span
        v-if="hasChildren && !isExpanded"
        class="text-xs px-2 py-0.5 rounded-full bg-muted/20 text-muted shrink-0"
      >
        {{ node.children.length }} sub
      </span>

      <!-- Edit icon -->
      <UIcon
        name="i-lucide-chevron-right"
        class="w-5 h-5 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      />
    </button>

    <!-- Children -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[1000px]"
      leave-from-class="opacity-100 max-h-[1000px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="isExpanded && hasChildren" class="overflow-hidden">
        <ActivitiesTreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
          :expanded-ids="expandedIds"
          @toggle="(id) => emit('toggle', id)"
          @select="(activity) => emit('select', activity)"
        />
      </div>
    </Transition>
  </div>
</template>
