<script setup lang="ts">
import type { ActivityNode } from '~/composables/useActivities'

const props = defineProps<{
  node: ActivityNode
  depth: number
  expandedIds: Set<number>
  selectedId?: number | null
}>()

const emit = defineEmits<{
  toggle: [id: number]
  select: [activity: ActivityNode]
}>()

const hasChildren = computed(() => props.node.children.length > 0)
const isExpanded = computed(() => props.expandedIds.has(props.node.id))
const isSelected = computed(() => props.selectedId === props.node.id)

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
      class="w-full flex items-center gap-2 p-2 rounded-lg transition-all group"
      :class="[
        isSelected
          ? 'bg-primary/20 ring-2 ring-primary'
          : 'hover:bg-elevated',
      ]"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      @click="handleSelect"
    >
      <!-- Expand/Collapse toggle -->
      <button
        v-if="hasChildren"
        class="w-6 h-6 flex items-center justify-center rounded hover:bg-muted/20 transition-colors"
        @click="handleToggle"
      >
        <UIcon
          :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="w-4 h-4 text-muted"
        />
      </button>
      <div v-else class="w-6" />

      <!-- Activity icon -->
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        :style="{ backgroundColor: `${node.color || '#6366f1'}20` }"
      >
        <UIcon
          :name="node.icon || 'i-lucide-circle'"
          class="w-4 h-4"
          :style="{ color: node.color || '#6366f1' }"
        />
      </div>

      <!-- Name -->
      <span class="flex-1 text-left font-medium truncate">{{ node.name }}</span>

      <!-- Default badge -->
      <span
        v-if="node.isDefault"
        class="text-xs px-2 py-0.5 rounded-full bg-muted/20 text-muted"
      >
        Default
      </span>

      <!-- Children count -->
      <span
        v-if="hasChildren && !isExpanded"
        class="text-xs text-muted"
      >
        {{ node.children.length }}
      </span>

      <!-- Selected indicator -->
      <UIcon
        v-if="isSelected"
        name="i-lucide-check"
        class="w-5 h-5 text-primary"
      />
    </button>

    <!-- Children -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 -translate-y-2"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="isExpanded && hasChildren">
        <CollapsibleTreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
          :expanded-ids="expandedIds"
          :selected-id="selectedId"
          @toggle="(id) => emit('toggle', id)"
          @select="(activity) => emit('select', activity)"
        />
      </div>
    </Transition>
  </div>
</template>
