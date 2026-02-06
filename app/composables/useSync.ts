export interface SyncQueueEvent {
    localId: string
    type: 'SWITCH'
    fromActivityId: number | null
    toActivityId: number
    timestamp: number
}

const STORAGE_KEY = 'timeflow_sync_queue'

interface SyncState {
    queue: SyncQueueEvent[]
    isOnline: boolean
    isSyncing: boolean
}

const syncState = reactive<SyncState>({
    queue: [],
    isOnline: true,
    isSyncing: false
})

/**
 * Load queue from IndexedDB/localStorage
 */
function loadQueue(): SyncQueueEvent[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved ? JSON.parse(saved) : []
    } catch {
        return []
    }
}

/**
 * Save queue to localStorage
 */
function saveQueue(queue: SyncQueueEvent[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function useSync() {
    /**
     * Add event to sync queue
     */
    async function addEvent(event: SyncQueueEvent) {
        syncState.queue.push(event)
        saveQueue(syncState.queue)
    }

    /**
     * Remove processed events from queue
     */
    function removeEvents(localIds: string[]) {
        const idSet = new Set(localIds)
        syncState.queue = syncState.queue.filter(e => !idSet.has(e.localId))
        saveQueue(syncState.queue)
    }

    /**
     * Sync queued events to server
     */
    async function syncToServer() {
        if (syncState.queue.length === 0 || syncState.isSyncing || !syncState.isOnline) {
            return
        }

        syncState.isSyncing = true

        try {
            const { data, error } = await useFetch('/api/sessions/sync', {
                method: 'POST',
                body: { events: syncState.queue }
            })

            if (!error.value && data.value?.processedLocalIds) {
                removeEvents(data.value.processedLocalIds)
            }
        } catch (error) {
            console.error('Sync failed:', error)
        } finally {
            syncState.isSyncing = false
        }
    }

    /**
     * Initialize sync system
     */
    function init() {
        if (!import.meta.client) return

        // Load existing queue
        syncState.queue = loadQueue()

        // Track online status
        syncState.isOnline = navigator.onLine

        const handleOnline = () => {
            syncState.isOnline = true
            // Sync when coming back online
            syncToServer()
        }

        const handleOffline = () => {
            syncState.isOnline = false
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Try to sync on init if online
        if (syncState.isOnline && syncState.queue.length > 0) {
            syncToServer()
        }

        // Cleanup
        onUnmounted(() => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        })
    }

    return {
        queue: computed(() => syncState.queue),
        isOnline: computed(() => syncState.isOnline),
        isSyncing: computed(() => syncState.isSyncing),
        pendingCount: computed(() => syncState.queue.length),
        addEvent,
        syncToServer,
        init
    }
}
