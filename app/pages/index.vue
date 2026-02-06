<script setup lang="ts">
const { isAuthenticated, isLoading } = useAuth()
const router = useRouter()

// Redirect based on auth state
watchEffect(() => {
  if (!isLoading.value) {
    if (isAuthenticated.value) {
      router.replace('/active')
    } else {
      router.replace('/auth/login')
    }
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
  </div>
</template>
