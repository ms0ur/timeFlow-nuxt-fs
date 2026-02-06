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
    isTracking: boolean // New: whether actively tracking (not stopped)
}

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
     * Fetch current session from server
     */
    async function fetchCurrentSession() {
        timerState.isLoading = true
        try {
            const data = await $fetch('/api/sessions/current')
            if (data?.session) {
                timerState.currentSession = {
                    ...data.session,
                    startedAt: new Date(data.session.startedAt)
                }
                timerState.isTracking = true
                startTicking()
            } else {
                timerState.currentSession = null
                timerState.elapsedMs = 0
                timerState.isTracking = false
            }
        } catch (error) {
            console.error('Failed to fetch current session:', error)
            // Try to restore from localStorage
            restoreFromLocalStorage()
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

        // Save to local storage for offline support
        if (import.meta.client) {
            localStorage.setItem('timeflow_current_session', JSON.stringify({
                activityId: toActivityId,
                startedAt: timestamp,
                activity,
                isTracking: true
            }))
        }

        if (isOnline.value) {
            // Online: send directly to server
            try {
                const data = await $fetch('/api/sessions/switch', {
                    method: 'POST',
                    body: { toActivityId, timestamp, localId }
                })

                if (data?.currentSession) {
                    timerState.currentSession = {
                        ...data.currentSession,
                        startedAt: new Date(data.currentSession.startedAt)
                    }
                }
            } catch (error) {
                console.error('Failed to switch activity:', error)
                // Revert on error
                if (previousSession) {
                    timerState.currentSession = previousSession
                }
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

        // Save state to localStorage
        if (import.meta.client) {
            localStorage.setItem('timeflow_current_session', JSON.stringify({
                activityId: previousSession.activityId,
                startedAt: previousSession.startedAt.getTime(),
                activity: previousSession.activity,
                isTracking: false,
                stoppedAt: timestamp
            }))
        }

        if (isOnline.value) {
            try {
                await $fetch('/api/sessions/stop', {
                    method: 'POST',
                    body: { timestamp, localId }
                })
                timerState.currentSession = null
                timerState.elapsedMs = 0
            } catch (error) {
                console.error('Failed to stop tracking:', error)
                // Revert if failed
                timerState.isTracking = true
                startTicking()
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
            timerState.currentSession = null
            timerState.elapsedMs = 0
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
     * Restore session from local storage (for offline support)
     */
    function restoreFromLocalStorage() {
        if (!import.meta.client) return

        const saved = localStorage.getItem('timeflow_current_session')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                timerState.currentSession = {
                    id: -1,
                    activityId: parsed.activityId,
                    startedAt: new Date(parsed.startedAt),
                    activity: parsed.activity
                }
                timerState.isTracking = parsed.isTracking !== false
                if (timerState.isTracking) {
                    startTicking()
                }
            } catch {
                // Invalid data, ignore
            }
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
        if (import.meta.client) {
            restoreFromLocalStorage()
            fetchCurrentSession()
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
