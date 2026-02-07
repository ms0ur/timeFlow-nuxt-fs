<script setup lang="ts">
const { latestEmotion, todayAverage, createEmotion, init } = useEmotions()
const { isOnline } = useSync()
const toast = useToast()

const showPicker = ref(false)
const isSubmitting = ref(false)

const emotionsList = [
    { rating: 1, icon: 'i-lucide-frown', color: 'text-red-500' },
    { rating: 2, icon: 'i-lucide-meh', color: 'text-orange-500' },
    { rating: 3, icon: 'i-lucide-minus-circle', color: 'text-yellow-500' },
    { rating: 4, icon: 'i-lucide-smile', color: 'text-lime-500' },
    { rating: 5, icon: 'i-lucide-laugh', color: 'text-green-500' }
]

function getIcon(rating: number) {
    return emotionsList.find(e => e.rating === rating) || emotionsList[2]
}

async function handleQuickSelect(rating: number) {
    isSubmitting.value = true
    try {
        await createEmotion(rating)
        showPicker.value = false
        toast.add({
            title: 'Mood logged!',
            color: 'success'
        })
    } catch {
        toast.add({
            title: 'Failed to log mood',
            color: 'error'
        })
    } finally {
        isSubmitting.value = false
    }
}

onMounted(() => {
    if (isOnline.value) {
        init()
    }
})
</script>

<template>
    <div class="p-4 rounded-xl bg-elevated">
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
                <UIcon name="i-lucide-heart" class="w-5 h-5 text-primary" />
                <span class="font-medium">Mood</span>
            </div>
            <div v-if="todayAverage" class="flex items-center gap-1 text-sm text-muted">
                <span>Today:</span>
                <UIcon 
                    :name="getIcon(Math.round(todayAverage)).icon"
                    :class="['w-5 h-5', getIcon(Math.round(todayAverage)).color]"
                />
                <span>({{ todayAverage.toFixed(1) }})</span>
            </div>
        </div>

        <!-- Offline notice -->
        <div v-if="!isOnline" class="text-sm text-muted text-center py-2">
            Offline — mood available when online
        </div>

        <!-- Quick action or latest -->
        <div v-else-if="!showPicker" class="flex items-center justify-between">
            <button
                v-if="latestEmotion"
                class="flex items-center gap-2 text-muted hover:text-default transition-colors"
                @click="showPicker = true"
            >
                <UIcon 
                    :name="getIcon(latestEmotion.rating).icon"
                    :class="['w-6 h-6', getIcon(latestEmotion.rating).color]"
                />
                <span class="text-sm">Update mood</span>
            </button>
            <button
                v-else
                class="text-sm text-muted hover:text-default transition-colors"
                @click="showPicker = true"
            >
                How are you feeling?
            </button>
            
            <UButton
                icon="i-lucide-plus"
                size="sm"
                variant="ghost"
                @click="showPicker = true"
            />
        </div>

        <!-- Picker -->
        <div v-else class="space-y-3">
            <EmotionPicker
                :model-value="null"
                size="md"
                @update:model-value="handleQuickSelect"
            />
            <div class="flex justify-center">
                <button
                    class="text-sm text-muted hover:text-default transition-colors"
                    :disabled="isSubmitting"
                    @click="showPicker = false"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
</template>
