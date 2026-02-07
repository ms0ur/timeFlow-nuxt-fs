<script setup lang="ts">
interface Props {
    modelValue?: number | null
    size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: null,
    size: 'md'
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void
}>()

// Using icons instead of emojis for better consistency
const emotions = [
    { rating: 1, icon: 'i-lucide-frown', label: 'Very bad', color: 'text-red-500' },
    { rating: 2, icon: 'i-lucide-meh', label: 'Bad', color: 'text-orange-500' },
    { rating: 3, icon: 'i-lucide-minus-circle', label: 'Neutral', color: 'text-yellow-500' },
    { rating: 4, icon: 'i-lucide-smile', label: 'Good', color: 'text-lime-500' },
    { rating: 5, icon: 'i-lucide-laugh', label: 'Very good', color: 'text-green-500' }
]

const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-14 h-14'
}

const iconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9'
}

function selectEmotion(rating: number) {
    emit('update:modelValue', rating)
}
</script>

<template>
    <div class="flex items-center justify-center gap-2">
        <button
            v-for="emotion in emotions"
            :key="emotion.rating"
            class="rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-default"
            :class="[
                sizeClasses[size],
                modelValue === emotion.rating
                    ? 'bg-primary/20 scale-110 ring-2 ring-primary'
                    : 'bg-elevated hover:bg-muted/20 opacity-70 hover:opacity-100'
            ]"
            :title="emotion.label"
            @click="selectEmotion(emotion.rating)"
        >
            <UIcon 
                :name="emotion.icon" 
                :class="[iconSizeClasses[size], emotion.color]" 
            />
        </button>
    </div>
</template>
