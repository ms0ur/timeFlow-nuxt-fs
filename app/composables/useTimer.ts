import type { Activity } from '~~/server/database/schema'

interface CurrentSession {
    id: number
    activityId: number
    startedAt: Date
    activity: {
        id: number
        name: string
        icon: string | null
        color: string | null
    }
}

interface TimerState {
    currentSession: CurrentSession | null
    elapsedMs: number
    isLoading: boolean
    isTracking: boolean
}

const STORAGE_KEY = 'timeflow_current_session'

const timerState = reactive<TimerState>({
    currentSession: null,
    elapsedMs: 0,
    isLoading: true,
    isTracking: true
})

let animationFrameId: number | null = null

function startTicking() {
    if (animationFrameId || !import.meta.client) return

    const tick = () => {
        if (timerState.currentSession && timerState.isTracking) {
            const startTime = new Date(timerState.currentSession.startedAt).getTime()
            timerState.elapsedMs = Date.now() - startTime
        }
        animationFrameId = requestAnimationFrame(tick)
    }

    tick()
}

function stopTicking() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
    }
}

export function useTimer() {
    const { addEvent, isOnline } = useSync()

    /**
     * Save current session to localStorage
     */
    function saveToLocalStorage() {
        if (!import.meta.client || !timerState.currentSession) return
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activityId: timerState.currentSession.activityId,
            startedAt: timerState.currentSession.startedAt.getTime(),
            activity: timerState.currentSession.activity,
            isTracking: timerState.isTracking,
            id: timerState.currentSession.id
        }))
    }

    /**
     * Clear session from localStorage
     */
    function clearLocalStorage() {
        if (!import.meta.client) return
        localStorage.removeItem(STORAGE_KEY)
    }

    /**
     * Restore session from localStorage
     */
    function restoreFromLocalStorage(): boolean {
        if (!import.meta.client) return false

        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                timerState.currentSession = {
                    id: parsed.id || -1,
                    activityId: parsed.activityId,
                    startedAt: new Date(parsed.startedAt),
                    activity: parsed.activity
                }
                timerState.isTracking = parsed.isTracking !== false
                if (timerState.isTracking) {
                    startTicking()
                }
                timerState.isLoading = false
                return true
            } catch {
                // Invalid data, ignore
            }
        }
        return false
    }

    /**
     * Fetch current session from server
     */
    async function fetchCurrentSession() {
        // Skip if in offline mode
        if (!isOnline.value) {
            timerState.isLoading = false
            return
        }

        timerState.isLoading = true
        try {
            const data = await $fetch<{ session: { id: number; activityId: number; startedAt: string; activity: { id: number; name: string; icon: string | null; color: string | null } } | null }>('/api/sessions/current')
            if (data?.session && data.session.activity) {
                timerState.currentSession = {
                    id: data.session.id,
                    activityId: data.session.activityId,
                    startedAt: new Date(data.session.startedAt),
                    activity: data.session.activity
                }
                timerState.isTracking = true
                startTicking()
                saveToLocalStorage()
            } else {
                timerState.currentSession = null
                timerState.elapsedMs = 0
                timerState.isTracking = false
                clearLocalStorage()
            }
        } catch (error) {
            console.error('Failed to fetch current session:', error)
            // Keep local state, don't wipe it
        } finally {
            timerState.isLoading = false
        }
    }

    /**
     * Switch to a new activity
     */
    async function switchActivity(toActivityId: number, activity: Pick<Activity, 'id' | 'name' | 'icon' | 'color'>) {
        const timestamp = Date.now()
        const localId = `switch_${timestamp}_${Math.random().toString(36).slice(2)}`

        // Optimistic update
        const previousSession = timerState.currentSession
        timerState.currentSession = {
            id: -1, // Temporary
            activityId: toActivityId,
            startedAt: new Date(timestamp),
            activity: {
                id: activity.id,
                name: activity.name,
                icon: activity.icon,
                color: activity.color
            }
        }
        timerState.elapsedMs = 0
        timerState.isTracking = true
        startTicking()
        saveToLocalStorage()

        if (isOnline.value) {
            // Online: send directly to server
            try {
                const data = await $fetch('/api/sessions/switch', {
                    method: 'POST',
                    body: { toActivityId, timestamp, localId }
                })

                if (data?.currentSession && data.currentSession.id !== undefined &&
                    data.currentSession.activityId !== undefined &&
                    data.currentSession.startedAt && data.currentSession.activity) {
                    timerState.currentSession = {
                        id: data.currentSession.id,
                        activityId: data.currentSession.activityId,
                        startedAt: new Date(data.currentSession.startedAt),
                        activity: {
                            id: data.currentSession.activity.id,
                            name: data.currentSession.activity.name,
                            icon: data.currentSession.activity.icon,
                            color: data.currentSession.activity.color
                        }
                    }
                    saveToLocalStorage()
                }
            } catch (error) {
                console.error('Failed to switch activity:', error)
                // Keep local state, queue for sync
                await addEvent({
                    localId,
                    type: 'SWITCH',
                    fromActivityId: previousSession?.activityId ?? null,
                    toActivityId,
                    timestamp
                })
            }
        } else {
            // Offline: queue event for sync
            await addEvent({
                localId,
                type: 'SWITCH',
                fromActivityId: previousSession?.activityId ?? null,
                toActivityId,
                timestamp
            })
        }
    }

    /**
     * Stop tracking (with confirmation required on caller side)
     */
    async function stopTracking() {
        if (!timerState.currentSession) return

        const timestamp = Date.now()
        const localId = `stop_${timestamp}_${Math.random().toString(36).slice(2)}`
        const previousSession = timerState.currentSession

        // Optimistic update: mark as not tracking
        timerState.isTracking = false
        stopTicking()
        timerState.currentSession = null
        timerState.elapsedMs = 0
        clearLocalStorage()

        if (isOnline.value) {
            try {
                await $fetch('/api/sessions/stop', {
                    method: 'POST',
                    body: { timestamp, localId }
                })
            } catch (error) {
                console.error('Failed to stop tracking:', error)
                // Queue for sync
                await addEvent({
                    localId,
                    type: 'STOP',
                    fromActivityId: previousSession.activityId,
                    toActivityId: null,
                    timestamp
                })
            }
        } else {
            // Queue for sync
            await addEvent({
                localId,
                type: 'STOP',
                fromActivityId: previousSession.activityId,
                toActivityId: null,
                timestamp
            })
        }
    }

    /**
     * Resume tracking (starts fresh)
     */
    async function resumeTracking() {
        const { defaultActivity } = useActivities()
        if (defaultActivity.value) {
            await switchActivity(defaultActivity.value.id, defaultActivity.value)
        }
    }

    /**
     * Format elapsed time as HH:MM:SS
     */
    const formattedTime = computed(() => {
        const totalSeconds = Math.floor(timerState.elapsedMs / 1000)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    })

    /**
     * Initialize timer on client side
     */
    function init() {
        if (!import.meta.client) return

        // Always restore from localStorage first
        const restored = restoreFromLocalStorage()

        // Only fetch from server if online AND nothing in local storage
        // OR if online and want to sync
        if (isOnline.value && !restored) {
            fetchCurrentSession()
        } else {
            timerState.isLoading = false
        }
    }

    return {
        currentSession: computed(() => timerState.currentSession),
        elapsedMs: computed(() => timerState.elapsedMs),
        formattedTime,
        isLoading: computed(() => timerState.isLoading),
        isTracking: computed(() => timerState.isTracking),
        switchActivity,
        stopTracking,
        resumeTracking,
        fetchCurrentSession,
        init
    }
}
