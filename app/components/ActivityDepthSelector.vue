<script setup lang="ts">
interface Props {
    modelValue: number
    maxDepth?: number
}

const props = withDefaults(defineProps<Props>(), {
    maxDepth: 3
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void
}>()

const depthOptions = computed(() => {
    const options = [
        { value: 0, label: 'All levels', description: 'Show every activity individually' }
    ]
    
    for (let i = 1; i <= props.maxDepth; i++) {
        options.push({
            value: i,
            label: `Level ${i}`,
            description: i === 1 
                ? 'Group into top-level categories only' 
                : `Show up to level ${i}, group deeper`
        })
    }
    
    return options
})

function selectDepth(depth: number) {
    emit('update:modelValue', depth)
}
</script>

<template>
    <div class="space-y-2">
        <label class="text-sm font-medium text-muted">Activity Depth</label>
        
        <div class="flex gap-2 flex-wrap">
            <button
                v-for="option in depthOptions"
                :key="option.value"
                class="px-3 py-1.5 rounded-lg text-sm transition-colors"
                :class="modelValue === option.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-elevated hover:bg-muted/20'"
                :title="option.description"
                @click="selectDepth(option.value)"
            >
                {{ option.label }}
            </button>
        </div>

        <p class="text-xs text-muted">
            {{ depthOptions.find(o => o.value === modelValue)?.description }}
        </p>
    </div>
</template>
