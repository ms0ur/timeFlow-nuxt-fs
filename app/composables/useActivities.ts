import type { Activity } from '~~/server/database/schema'

export interface ActivityNode extends Activity {
    children: ActivityNode[]
    totalDuration?: number // Aggregated from stats
}

interface ActivitiesState {
    activities: Activity[]
    tree: ActivityNode[]
    isLoading: boolean
}

const activitiesState = reactive<ActivitiesState>({
    activities: [],
    tree: [],
    isLoading: true
})

/**
 * Build tree structure from flat list
 */
function buildTree(activities: Activity[]): ActivityNode[] {
    const map = new Map<number, ActivityNode>()
    const roots: ActivityNode[] = []

    // First pass: create nodes with empty children
    for (const activity of activities) {
        map.set(activity.id, { ...activity, children: [] })
    }

    // Second pass: link children to parents
    for (const activity of activities) {
        const node = map.get(activity.id)!
        if (activity.parentId && map.has(activity.parentId)) {
            map.get(activity.parentId)!.children.push(node)
        } else {
            roots.push(node)
        }
    }

    return roots
}

export function useActivities() {
    /**
     * Fetch all activities from server
     */
    async function fetchActivities() {
        activitiesState.isLoading = true
        try {
            const data = await $fetch('/api/activities')
            if (data?.activities) {
                activitiesState.activities = data.activities
                activitiesState.tree = buildTree(data.activities)

                // Cache in localStorage
                if (import.meta.client) {
                    localStorage.setItem('timeflow_activities', JSON.stringify(data.activities))
                }
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error)
            // Try to restore from cache
            restoreFromCache()
        } finally {
            activitiesState.isLoading = false
        }
    }

    /**
     * Restore from localStorage cache
     */
    function restoreFromCache() {
        if (!import.meta.client) return
        const cached = localStorage.getItem('timeflow_activities')
        if (cached) {
            try {
                const activities = JSON.parse(cached)
                activitiesState.activities = activities
                activitiesState.tree = buildTree(activities)
            } catch {
                // Invalid cache
            }
        }
    }

    /**
     * Create a new activity
     */
    async function createActivity(data: { name: string; parentId?: number | null; icon?: string; color?: string }) {
        try {
            const result = await $fetch('/api/activities', {
                method: 'POST',
                body: data
            })

            // Optimistic update
            if (result?.activity) {
                activitiesState.activities.push(result.activity)
                activitiesState.tree = buildTree(activitiesState.activities)
            }

            // Refresh to get server state
            await fetchActivities()
            return result?.activity
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } }
            throw new Error(err.data?.message || 'Failed to create activity')
        }
    }

    /**
     * Update an existing activity
     */
    async function updateActivity(id: number, data: { name?: string; parentId?: number | null; icon?: string; color?: string; isDefault?: boolean }) {
        try {
            const result = await $fetch(`/api/activities/${id}`, {
                method: 'PATCH',
                body: data
            })

            await fetchActivities()
            return result?.activity
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } }
            throw new Error(err.data?.message || 'Failed to update activity')
        }
    }

    /**
     * Delete an activity
     */
    async function deleteActivity(id: number) {
        try {
            await $fetch(`/api/activities/${id}`, {
                method: 'DELETE'
            })
            await fetchActivities()
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } }
            throw new Error(err.data?.message || 'Failed to delete activity')
        }
    }

    /**
     * Get activity by ID
     */
    function getActivityById(id: number): Activity | undefined {
        return activitiesState.activities.find(a => a.id === id)
    }

    /**
     * Get default activity
     */
    const defaultActivity = computed(() => {
        return activitiesState.activities.find(a => a.isDefault)
    })

    /**
     * Initialize on client side
     */
    function init() {
        if (import.meta.client) {
            restoreFromCache()
            fetchActivities()
        }
    }

    return {
        activities: computed(() => activitiesState.activities),
        tree: computed(() => activitiesState.tree),
        isLoading: computed(() => activitiesState.isLoading),
        defaultActivity,
        fetchActivities,
        createActivity,
        updateActivity,
        deleteActivity,
        getActivityById,
        init
    }
}
