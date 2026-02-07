<script setup lang="ts">
import type { Emotion } from '~~/server/database/schema'

definePageMeta({
    layout: 'default'
})

const { emotions, isLoading, todayStats, fetchEmotions, createEmotion, updateEmotion, init } = useEmotions()
const { requireAuth } = useAuth()
const { isOnline } = useSync()
const toast = useToast()

const selectedRating = ref<number | null>(null)
const description = ref('')
const isSubmitting = ref(false)

// Edit modal
const editingEmotion = ref<Emotion | null>(null)
const editRating = ref<number | null>(null)
const editDescription = ref('')
const isEditing = ref(false)
const isEditModalOpen = computed({
    get: () => editingEmotion.value !== null,
    set: (val: boolean) => { if (!val) closeEditModal() }
})

onMounted(async () => {
    await requireAuth()
    if (isOnline.value) {
        await init()
    }
})

// Icons instead of emojis
const emotionsList = [
    { rating: 1, icon: 'i-lucide-frown', label: 'Very bad', color: 'text-red-500' },
    { rating: 2, icon: 'i-lucide-meh', label: 'Bad', color: 'text-orange-500' },
    { rating: 3, icon: 'i-lucide-minus-circle', label: 'Neutral', color: 'text-yellow-500' },
    { rating: 4, icon: 'i-lucide-smile', label: 'Good', color: 'text-lime-500' },
    { rating: 5, icon: 'i-lucide-laugh', label: 'Very good', color: 'text-green-500' }
]

function getIcon(rating: number) {
    return emotionsList.find(e => e.rating === rating) || emotionsList[2]
}

function formatTime(date: Date | string): string {
    const d = new Date(date)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date: Date | string): string {
    const d = new Date(date)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) {
        return 'Today'
    }
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
    }
    return d.toLocaleDateString()
}

async function handleSubmit() {
    if (!selectedRating.value) return

    isSubmitting.value = true
    try {
        await createEmotion(selectedRating.value, description.value || undefined)
        
        toast.add({
            title: 'Mood logged!',
            color: 'success'
        })

        // Reset form
        selectedRating.value = null
        description.value = ''
    } catch {
        toast.add({
            title: 'Failed to log mood',
            color: 'error'
        })
    } finally {
        isSubmitting.value = false
    }
}

function openEditModal(emotion: Emotion) {
    editingEmotion.value = emotion
    editRating.value = emotion.rating
    editDescription.value = emotion.description || ''
}

function closeEditModal() {
    editingEmotion.value = null
    editRating.value = null
    editDescription.value = ''
}

async function handleUpdate() {
    if (!editingEmotion.value || !editRating.value) return

    isEditing.value = true
    try {
        await updateEmotion(editingEmotion.value.id, {
            rating: editRating.value,
            description: editDescription.value || undefined
        })
        
        toast.add({
            title: 'Mood updated!',
            color: 'success'
        })

        closeEditModal()
    } catch {
        toast.add({
            title: 'Failed to update',
            color: 'error'
        })
    } finally {
        isEditing.value = false
    }
}
</script>

<template>
    <div class="container mx-auto px-4 py-6">
        <h1 class="text-2xl font-bold mb-6">Emotions</h1>

        <!-- Offline notice -->
        <div v-if="!isOnline" class="p-3 rounded-xl bg-amber-500/20 text-amber-500 mb-6 text-center">
            <UIcon name="i-lucide-wifi-off" class="w-4 h-4 inline mr-1" />
            Offline — emotions require connection
        </div>

        <!-- Today's Summary -->
        <div v-if="todayStats" class="p-4 rounded-xl bg-elevated mb-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm text-muted">Today's average</p>
                    <div class="flex items-center gap-2 mt-1">
                        <UIcon 
                            v-if="todayStats.average" 
                            :name="getIcon(Math.round(todayStats.average)).icon"
                            :class="['w-8 h-8', getIcon(Math.round(todayStats.average)).color]"
                        />
                        <span v-if="todayStats.average" class="text-xl font-semibold">
                            {{ todayStats.average.toFixed(1) }}
                        </span>
                        <span v-else class="text-muted">No entries yet</span>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm text-muted">Entries</p>
                    <p class="text-xl font-semibold">{{ todayStats.total }}</p>
                </div>
            </div>
        </div>

        <!-- Log New Emotion -->
        <div v-if="isOnline" class="p-4 rounded-xl bg-elevated mb-6">
            <h2 class="font-medium mb-4">How are you feeling?</h2>
            
            <EmotionPicker
                v-model="selectedRating"
                size="lg"
                class="mb-4"
            />

            <UTextarea
                v-model="description"
                placeholder="Add a note (optional)..."
                :rows="2"
                class="mb-4"
            />

            <UButton
                label="Log Mood"
                color="primary"
                block
                :loading="isSubmitting"
                :disabled="!selectedRating"
                @click="handleSubmit"
            />
        </div>

        <!-- Recent Emotions -->
        <div>
            <h2 class="font-medium mb-4">Recent</h2>
            
            <div v-if="isLoading" class="text-center py-8 text-muted">
                <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin mx-auto" />
            </div>

            <div v-else-if="emotions.length === 0" class="text-center py-8 text-muted">
                <UIcon name="i-lucide-heart" class="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No mood entries yet</p>
            </div>

            <div v-else class="space-y-3">
                <button
                    v-for="emotion in emotions"
                    :key="emotion.id"
                    class="w-full p-3 rounded-xl bg-elevated flex items-start gap-3 text-left hover:bg-muted/10 transition-colors"
                    @click="openEditModal(emotion)"
                >
                    <UIcon 
                        :name="getIcon(emotion.rating).icon" 
                        :class="['w-7 h-7 flex-shrink-0', getIcon(emotion.rating).color]" 
                    />
                    <div class="flex-1 min-w-0">
                        <p v-if="emotion.description" class="text-sm">
                            {{ emotion.description }}
                        </p>
                        <p v-else class="text-sm text-muted italic">
                            {{ getIcon(emotion.rating).label }}
                        </p>
                        <p class="text-xs text-muted mt-1">
                            {{ formatDate(emotion.createdAt) }} at {{ formatTime(emotion.createdAt) }}
                        </p>
                    </div>
                    <UIcon name="i-lucide-pencil" class="w-4 h-4 text-muted flex-shrink-0" />
                </button>
            </div>

            <div v-if="emotions.length >= 20" class="mt-4 text-center">
                <UButton
                    label="Load more"
                    variant="ghost"
                    @click="fetchEmotions(emotions.length + 20)"
                />
            </div>
        </div>

        <!-- Edit Modal -->
        <UModal v-model:open="isEditModalOpen">
            <template #content>
                <div class="p-6">
                    <h3 class="text-lg font-semibold mb-4">Edit Mood Entry</h3>
                    
                    <EmotionPicker
                        v-model="editRating"
                        size="md"
                        class="mb-4"
                    />

                    <UTextarea
                        v-model="editDescription"
                        placeholder="Add a note..."
                        :rows="3"
                        class="mb-4"
                    />

                    <div class="flex gap-3">
                        <UButton
                            label="Cancel"
                            variant="ghost"
                            class="flex-1"
                            @click="closeEditModal"
                        />
                        <UButton
                            label="Save"
                            color="primary"
                            class="flex-1"
                            :loading="isEditing"
                            :disabled="!editRating"
                            @click="handleUpdate"
                        />
                    </div>
                </div>
            </template>
        </UModal>
    </div>
</template>
