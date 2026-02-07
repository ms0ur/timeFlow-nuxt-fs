export interface SyncQueueEvent {
    localId: string
    type: 'SWITCH' | 'STOP'
    fromActivityId: number | null
    toActivityId: number | null
    timestamp: number
}

const STORAGE_KEY = 'timeflow_sync_queue'
const OFFLINE_MODE_KEY = 'timeflow_offline_mode'

interface SyncState {
    queue: SyncQueueEvent[]
    networkOnline: boolean // Browser network status
    isSyncing: boolean
}

const syncState = reactive<SyncState>({
    queue: [],
    networkOnline: true,
    isSyncing: false
})

/**
 * Load queue from localStorage
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

/**
 * Check if forced offline mode is enabled (read from localStorage to avoid circular dep)
 */
function isForcedOffline(): boolean {
    if (!import.meta.client) return false
    try {
        const saved = localStorage.getItem(OFFLINE_MODE_KEY)
        return saved ? JSON.parse(saved) : false
    } catch {
        return false
    }
}

export function useSync() {
    /**
     * Effective online status: network is online AND not in forced offline mode
     */
    const isEffectivelyOnline = computed(() => {
        return syncState.networkOnline && !isForcedOffline()
    })

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
        // Check effective online status (includes forced offline check)
        if (syncState.queue.length === 0 || syncState.isSyncing || !isEffectivelyOnline.value) {
            return
        }

        syncState.isSyncing = true

        try {
            const data = await $fetch('/api/sessions/sync', {
                method: 'POST',
                body: { events: syncState.queue }
            })

            if (data?.processedLocalIds) {
                removeEvents(data.processedLocalIds as string[])
            }
        } catch (error) {
            console.error('Sync failed:', error)
        } finally {
            syncState.isSyncing = false
        }
    }

    /**
     * User manually tries to go online
     */
    async function tryGoOnline() {
        // This should be called from UI, check if network is available
        if (syncState.networkOnline) {
            await syncToServer()
            return true
        }
        return false
    }

    /**
     * Initialize sync system
     */
    function init() {
        if (!import.meta.client) return

        // Load existing queue
        syncState.queue = loadQueue()

        // Track network status (not effective online - that considers forced mode)
        syncState.networkOnline = navigator.onLine

        const handleOnline = () => {
            syncState.networkOnline = true
            // DON'T auto-sync when network comes back - user must manually go online
            // This respects forced offline mode
        }

        const handleOffline = () => {
            syncState.networkOnline = false
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Cleanup
        onUnmounted(() => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        })
    }

    return {
        queue: computed(() => syncState.queue),
        networkOnline: computed(() => syncState.networkOnline),
        isOnline: isEffectivelyOnline, // Backward compat: this is now "effectively online"
        isSyncing: computed(() => syncState.isSyncing),
        pendingCount: computed(() => syncState.queue.length),
        addEvent,
        syncToServer,
        tryGoOnline,
        init
    }
}
