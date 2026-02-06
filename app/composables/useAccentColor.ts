// Accent color theming composable
// Dynamically updates CSS custom properties based on user's accent color

interface AccentColorConfig {
    name: string
    hex: string
    oklch: string // OKLCH color for Nuxt UI compatibility
}

// Preset accent colors with OKLCH values for Nuxt UI theming
export const accentColors: AccentColorConfig[] = [
    { name: 'Indigo', hex: '#6366f1', oklch: '0.59 0.22 264' },
    { name: 'Violet', hex: '#8b5cf6', oklch: '0.55 0.22 288' },
    { name: 'Pink', hex: '#ec4899', oklch: '0.65 0.24 340' },
    { name: 'Rose', hex: '#f43f5e', oklch: '0.64 0.24 13' },
    { name: 'Red', hex: '#ef4444', oklch: '0.63 0.23 25' },
    { name: 'Orange', hex: '#f97316', oklch: '0.70 0.19 45' },
    { name: 'Amber', hex: '#f59e0b', oklch: '0.73 0.17 70' },
    { name: 'Yellow', hex: '#eab308', oklch: '0.79 0.18 95' },
    { name: 'Lime', hex: '#84cc16', oklch: '0.77 0.20 130' },
    { name: 'Green', hex: '#22c55e', oklch: '0.72 0.19 145' },
    { name: 'Emerald', hex: '#10b981', oklch: '0.69 0.17 165' },
    { name: 'Teal', hex: '#14b8a6', oklch: '0.70 0.12 185' },
    { name: 'Cyan', hex: '#06b6d4', oklch: '0.71 0.14 200' },
    { name: 'Sky', hex: '#0ea5e9', oklch: '0.67 0.16 230' },
    { name: 'Blue', hex: '#3b82f6', oklch: '0.60 0.21 255' },
]

// State - persisted
const currentAccentColor = ref<string>('#22c55e') // Default green

export function useAccentColor() {
    const { user } = useAuth()

    // Apply accent color to CSS variables
    function applyAccentColor(hex: string) {
        if (!import.meta.client) return

        const colorConfig = accentColors.find(c => c.hex === hex)
        if (!colorConfig) return

        const root = document.documentElement

        // For Nuxt UI, we need to update the color variable
        // The primary color uses oklch format in Nuxt UI 4
        // We set a custom CSS variable and use it throughout the app
        root.style.setProperty('--accent-color', hex)
        root.style.setProperty('--accent-color-oklch', colorConfig.oklch)

        // Also create RGB version for gradients
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        root.style.setProperty('--accent-color-rgb', `${r} ${g} ${b}`)

        currentAccentColor.value = hex

        // Persist to localStorage
        localStorage.setItem('timeflow-accent-color', hex)
    }

    // Watch user accent color changes
    watch(
        () => user.value?.accentColor,
        (newColor) => {
            if (newColor) {
                applyAccentColor(newColor)
            }
        },
        { immediate: true }
    )

    // Initialize on mount - check localStorage first, then user preference
    function init() {
        const stored = localStorage.getItem('timeflow-accent-color')
        if (stored) {
            applyAccentColor(stored)
        } else if (user.value?.accentColor) {
            applyAccentColor(user.value.accentColor)
        } else {
            // Default green (matching app.config primary)
            applyAccentColor('#22c55e')
        }
    }

    return {
        currentAccentColor: computed(() => currentAccentColor.value),
        accentColors,
        applyAccentColor,
        init
    }
}
