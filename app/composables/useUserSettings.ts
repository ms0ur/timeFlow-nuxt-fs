interface SettingsResponse {
    settings: {
        weekStartDay: number
        dayStartHour: number
    }
}

interface UserSettingsState {
    weekStartDay: number // 0=Sunday, 1=Monday...6=Saturday
    dayStartHour: number // 0-23
    offlineMode: boolean // Client-only, stored in localStorage
    isLoading: boolean
}

const OFFLINE_MODE_KEY = 'timeflow_offline_mode'

const settingsState = reactive<UserSettingsState>({
    weekStartDay: 1, // Default: Monday
    dayStartHour: 0, // Default: Midnight
    offlineMode: false,
    isLoading: false
})

export function useUserSettings() {
    /**
     * Fetch settings from server
     */
    async function fetchSettings() {
        settingsState.isLoading = true
        try {
            const data = await $fetch<SettingsResponse>('/api/settings/user')
            settingsState.weekStartDay = data.settings.weekStartDay
            settingsState.dayStartHour = data.settings.dayStartHour
        } catch (error) {
            console.error('Failed to fetch settings:', error)
        } finally {
            settingsState.isLoading = false
        }
    }

    /**
     * Update settings on server
     */
    async function updateSettings(settings: { weekStartDay?: number; dayStartHour?: number }) {
        settingsState.isLoading = true
        try {
            const data = await $fetch<SettingsResponse>('/api/settings/user', {
                method: 'PATCH',
                body: settings
            })
            settingsState.weekStartDay = data.settings.weekStartDay
            settingsState.dayStartHour = data.settings.dayStartHour
        } catch (error) {
            console.error('Failed to update settings:', error)
            throw error
        } finally {
            settingsState.isLoading = false
        }
    }

    /**
     * Toggle offline mode (client-only)
     */
    function setOfflineMode(value: boolean) {
        settingsState.offlineMode = value
        if (import.meta.client) {
            localStorage.setItem(OFFLINE_MODE_KEY, JSON.stringify(value))
        }
    }

    /**
     * Load offline mode from localStorage
     */
    function loadOfflineMode() {
        if (!import.meta.client) return
        try {
            const saved = localStorage.getItem(OFFLINE_MODE_KEY)
            if (saved !== null) {
                settingsState.offlineMode = JSON.parse(saved)
            }
        } catch {
            // Invalid data, use default
        }
    }

    /**
     * Get date range for a given period, respecting dayStartHour
     */
    function getDateRangeForPeriod(period: 'today' | 'yesterday' | 'week' | 'month') {
        const now = new Date()
        const dayStartHour = settingsState.dayStartHour

        // Calculate "logical today" based on dayStartHour
        const logicalToday = new Date(now)
        if (now.getHours() < dayStartHour) {
            // Before day start hour = still previous logical day
            logicalToday.setDate(logicalToday.getDate() - 1)
        }
        logicalToday.setHours(dayStartHour, 0, 0, 0)

        const logicalTomorrow = new Date(logicalToday)
        logicalTomorrow.setDate(logicalTomorrow.getDate() + 1)

        switch (period) {
            case 'today':
                return { from: logicalToday, to: now }

            case 'yesterday': {
                const yesterdayStart = new Date(logicalToday)
                yesterdayStart.setDate(yesterdayStart.getDate() - 1)
                return { from: yesterdayStart, to: logicalToday }
            }

            case 'week': {
                const weekStart = new Date(logicalToday)
                const currentDay = weekStart.getDay()
                const diff = (currentDay - settingsState.weekStartDay + 7) % 7
                weekStart.setDate(weekStart.getDate() - diff)
                weekStart.setHours(dayStartHour, 0, 0, 0)
                return { from: weekStart, to: now }
            }

            case 'month': {
                const monthStart = new Date(logicalToday)
                monthStart.setDate(1)
                monthStart.setHours(dayStartHour, 0, 0, 0)
                return { from: monthStart, to: now }
            }

            default:
                return { from: logicalToday, to: now }
        }
    }

    /**
     * Initialize settings
     */
    async function init() {
        loadOfflineMode()
        if (import.meta.client && !settingsState.offlineMode) {
            await fetchSettings()
        }
    }

    return {
        weekStartDay: computed(() => settingsState.weekStartDay),
        dayStartHour: computed(() => settingsState.dayStartHour),
        offlineMode: computed(() => settingsState.offlineMode),
        isLoading: computed(() => settingsState.isLoading),
        fetchSettings,
        updateSettings,
        setOfflineMode,
        getDateRangeForPeriod,
        init
    }
}
