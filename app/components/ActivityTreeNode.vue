<script setup lang="ts">
import type { ActivityNode } from '~/composables/useActivities'

const props = defineProps<{
  node: ActivityNode
  depth: number
  expandedIds: Set<number>
  currentActivityId?: number | null
}>()

const emit = defineEmits<{
  toggle: [id: number]
  select: [activity: ActivityNode]
}>()

const hasChildren = computed(() => props.node.children.length > 0)
const isExpanded = computed(() => props.expandedIds.has(props.node.id))
const isCurrentActivity = computed(() => props.currentActivityId === props.node.id)

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
      class="w-full flex items-center gap-2 p-3 rounded-xl transition-all group"
      :class="[
        isCurrentActivity
          ? 'bg-primary/20 ring-2 ring-primary'
          : 'bg-elevated hover:bg-muted/10',
      ]"
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
      <UIcon
        :name="node.icon || 'i-lucide-circle'"
        class="w-6 h-6 shrink-0"
        :style="{ color: node.color || '#6366f1' }"
      />

      <!-- Name -->
      <div class="flex-1 text-left min-w-0">
        <p class="font-medium truncate">{{ node.name }}</p>
        <p v-if="node.isDefault" class="text-xs text-muted">Default</p>
      </div>

      <!-- Children count badge -->
      <span
        v-if="hasChildren && !isExpanded"
        class="text-xs px-2 py-0.5 rounded-full bg-muted/20 text-muted shrink-0"
      >
        {{ node.children.length }}
      </span>

      <!-- Current indicator -->
      <UIcon
        v-if="isCurrentActivity"
        name="i-lucide-check"
        class="w-5 h-5 text-primary shrink-0"
      />
    </button>

    <!-- Children -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[500px]"
      leave-from-class="opacity-100 max-h-[500px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="isExpanded && hasChildren" class="overflow-hidden">
        <ActivityTreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
          :expanded-ids="expandedIds"
          :current-activity-id="currentActivityId"
          @toggle="(id) => emit('toggle', id)"
          @select="(activity) => emit('select', activity)"
        />
      </div>
    </Transition>
  </div>
</template>
