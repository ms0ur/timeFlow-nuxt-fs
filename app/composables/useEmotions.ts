import type { Emotion } from '~~/server/database/schema'

interface EmotionsResponse {
    emotions: Emotion[]
}

interface EmotionStatsResponse {
    stats: {
        average: number | null
        total: number
        distribution: Record<number, number>
    }
}

interface CreateEmotionResponse {
    emotion: Emotion
}

interface EmotionState {
    emotions: Emotion[]
    isLoading: boolean
    todayStats: {
        average: number | null
        total: number
        distribution: Record<number, number>
    } | null
}

const emotionState = reactive<EmotionState>({
    emotions: [],
    isLoading: false,
    todayStats: null
})

export function useEmotions() {
    const { isOnline } = useSync()

    /**
     * Fetch recent emotions
     */
    async function fetchEmotions(limit = 20) {
        emotionState.isLoading = true
        try {
            const data = await $fetch<EmotionsResponse>('/api/emotions', {
                query: { limit }
            })
            emotionState.emotions = data.emotions
        } catch (error) {
            console.error('Failed to fetch emotions:', error)
        } finally {
            emotionState.isLoading = false
        }
    }

    /**
     * Fetch today's emotion statistics
     */
    async function fetchTodayStats() {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const data = await $fetch<EmotionStatsResponse>('/api/emotions/stats', {
                query: {
                    from: today.toISOString(),
                    to: new Date().toISOString()
                }
            })
            emotionState.todayStats = data.stats
        } catch (error) {
            console.error('Failed to fetch emotion stats:', error)
        }
    }

    /**
     * Create a new emotion entry
     */
    async function createEmotion(rating: number, description?: string, sessionId?: number) {
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5')
        }

        try {
            const data = await $fetch<CreateEmotionResponse>('/api/emotions', {
                method: 'POST',
                body: { rating, description, sessionId }
            })

            // Add to local state
            emotionState.emotions.unshift(data.emotion)

            // Refresh stats
            await fetchTodayStats()

            return data.emotion
        } catch (error) {
            console.error('Failed to create emotion:', error)
            throw error
        }
    }

    /**
     * Update an existing emotion
     */
    async function updateEmotion(id: number, updates: { rating?: number; description?: string }) {
        if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 5)) {
            throw new Error('Rating must be between 1 and 5')
        }

        try {
            const data = await $fetch<CreateEmotionResponse>(`/api/emotions/${id}`, {
                method: 'PATCH',
                body: updates
            })

            // Update in local state
            const index = emotionState.emotions.findIndex(e => e.id === id)
            if (index !== -1) {
                emotionState.emotions[index] = data.emotion
            }

            // Refresh stats if rating changed
            if (updates.rating !== undefined) {
                await fetchTodayStats()
            }

            return data.emotion
        } catch (error) {
            console.error('Failed to update emotion:', error)
            throw error
        }
    }

    /**
     * Get latest emotion
     */
    const latestEmotion = computed(() => {
        return emotionState.emotions[0] || null
    })

    /**
     * Get today's average rating
     */
    const todayAverage = computed(() => {
        return emotionState.todayStats?.average || null
    })

    /**
     * Initialize emotions
     */
    async function init() {
        if (import.meta.client && isOnline.value) {
            await Promise.all([
                fetchEmotions(),
                fetchTodayStats()
            ])
        }
    }

    return {
        emotions: computed(() => emotionState.emotions),
        isLoading: computed(() => emotionState.isLoading),
        todayStats: computed(() => emotionState.todayStats),
        latestEmotion,
        todayAverage,
        fetchEmotions,
        fetchTodayStats,
        createEmotion,
        updateEmotion,
        init
    }
}
