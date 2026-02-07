<script setup lang="ts">
const { offlineMode, setOfflineMode } = useUserSettings()
const { networkOnline, syncToServer, tryGoOnline } = useSync()

async function handleGoOnline() {
    setOfflineMode(false)
    // Try to sync pending data
    await syncToServer()
}
</script>

<template>
    <!-- Banner pushes content down (not fixed position) -->
    <div
        v-if="offlineMode"
        class="bg-amber-500 text-black px-4 py-2"
    >
        <div class="container mx-auto flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
                <UIcon name="i-lucide-wifi-off" class="w-5 h-5" />
                <span class="text-sm font-medium">
                    Offline mode — sync disabled
                </span>
                <span v-if="!networkOnline" class="text-xs opacity-75">(no network)</span>
            </div>
            <UButton
                v-if="networkOnline"
                label="Go Online"
                size="xs"
                color="neutral"
                variant="solid"
                @click="handleGoOnline"
            />
            <span v-else class="text-xs opacity-75">Network unavailable</span>
        </div>
    </div>
</template>
