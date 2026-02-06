interface User {
    id: number
    email: string
    name: string | null
    accentColor: string | null
    createdAt: string | Date
}

interface AuthState {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
}

const authState = reactive<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
})

export function useAuth() {
    const router = useRouter()

    /**
     * Fetch current user from server (uses httpOnly cookie automatically)
     */
    async function fetchUser() {
        authState.isLoading = true
        try {
            const data = await $fetch('/api/auth/me')
            if (data?.user) {
                authState.user = data.user as User
                authState.isAuthenticated = true
            } else {
                authState.user = null
                authState.isAuthenticated = false
            }
        } catch {
            authState.user = null
            authState.isAuthenticated = false
        } finally {
            authState.isLoading = false
        }
    }

    /**
     * Login with email and password
     */
    async function login(email: string, password: string) {
        try {
            const data = await $fetch('/api/auth/login', {
                method: 'POST',
                body: { email, password }
            })

            if (data?.user) {
                authState.user = data.user as User
                authState.isAuthenticated = true
                await router.push('/active')
            }

            return data
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } }
            throw new Error(err.data?.message || 'Login failed')
        }
    }

    /**
     * Register new user
     */
    async function register(email: string, password: string) {
        try {
            const data = await $fetch('/api/auth/register', {
                method: 'POST',
                body: { email, password }
            })

            if (data?.user) {
                authState.user = data.user as User
                authState.isAuthenticated = true
                await router.push('/active')
            }

            return data
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } }
            throw new Error(err.data?.message || 'Registration failed')
        }
    }

    /**
     * Logout user
     */
    async function logout() {
        try {
            await $fetch('/api/auth/logout', { method: 'POST' })
        } catch {
            // Ignore logout errors
        }
        authState.user = null
        authState.isAuthenticated = false
        await router.push('/auth/login')
    }

    /**
     * Update user profile
     */
    async function updateUser(updates: { name?: string; accentColor?: string }) {
        try {
            const data = await $fetch('/api/settings', {
                method: 'PATCH',
                body: updates
            }) as { success: boolean; user?: { name: string | null; accentColor: string | null } }

            if (data.user && authState.user) {
                authState.user = {
                    ...authState.user,
                    name: data.user.name,
                    accentColor: data.user.accentColor
                }
            }

            return data
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } }
            throw new Error(err.data?.message || 'Failed to update profile')
        }
    }

    /**
     * Check if user is authenticated, redirect if not
     */
    async function requireAuth() {
        if (authState.isLoading) {
            await fetchUser()
        }
        if (!authState.isAuthenticated) {
            await router.push('/auth/login')
            return false
        }
        return true
    }

    /**
     * Initialize auth - for SSR compatibility
     */
    function init() {
        if (import.meta.client && authState.isLoading) {
            fetchUser()
        }
    }

    return {
        user: computed(() => authState.user),
        isAuthenticated: computed(() => authState.isAuthenticated),
        isLoading: computed(() => authState.isLoading),
        login,
        register,
        logout,
        fetchUser,
        updateUser,
        requireAuth,
        init
    }
}
