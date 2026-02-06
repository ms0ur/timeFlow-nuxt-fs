<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { user, logout, requireAuth, updateUser } = useAuth()
const { activities, defaultActivity, updateActivity, fetchActivities } = useActivities()
const { accentColors, applyAccentColor } = useAccentColor()
const colorMode = useColorMode()
const toast = useToast()

const isLoading = ref(false)

onMounted(async () => {
  await requireAuth()
  await fetchActivities()
})

// Theme toggle
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value) => {
    colorMode.preference = value ? 'dark' : 'light'
  }
})

// Profile editing
const showProfileModal = ref(false)
const editName = ref('')
const editAccentColor = ref('#6366f1')

// Use accent colors from the composable
const accentColorOptions = accentColors

function openProfileModal() {
  editName.value = user.value?.name || ''
  editAccentColor.value = user.value?.accentColor || '#6366f1'
  showProfileModal.value = true
}

async function saveProfile() {
  isLoading.value = true
  try {
    await updateUser({
      name: editName.value,
      accentColor: editAccentColor.value
    })

    // Apply accent color immediately to the whole app
    applyAccentColor(editAccentColor.value)

    toast.add({
      title: 'Profile updated!',
      color: 'success'
    })

    showProfileModal.value = false
  } catch (error) {
    toast.add({
      title: 'Failed to update profile',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

// Default activity selection
const showDefaultActivityModal = ref(false)

async function setDefaultActivity(activityId: number) {
  isLoading.value = true
  try {
    await updateActivity(activityId, { isDefault: true })
    toast.add({
      title: 'Default activity updated',
      color: 'success'
    })
    showDefaultActivityModal.value = false
  } catch (error) {
    toast.add({
      title: 'Failed to update',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

// Logout confirmation
const showLogoutModal = ref(false)

async function handleLogout() {
  await logout()
}

// Get display name
const displayName = computed(() => {
  if (user.value?.name) return user.value.name
  if (user.value?.email) return user.value.email.split('@')[0]
  return 'User'
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <h1 class="text-2xl font-bold mb-6">Settings</h1>

    <!-- User Info Card -->
    <button
      class="w-full p-4 rounded-xl bg-elevated mb-6 hover:bg-muted/10 transition-colors text-left"
      @click="openProfileModal"
    >
      <div class="flex items-center gap-4">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
          :style="{ backgroundColor: `${user?.accentColor || '#6366f1'}30`, color: user?.accentColor || '#6366f1' }"
        >
          {{ displayName.charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1">
          <p class="font-semibold text-lg">{{ displayName }}</p>
          <p class="text-sm text-muted">{{ user?.email }}</p>
        </div>
        <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-muted" />
      </div>
    </button>

    <!-- Settings List -->
    <div class="space-y-4">
      <!-- Theme -->
      <div class="p-4 rounded-xl bg-elevated flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-moon" class="w-5 h-5 text-muted" />
          <span>Dark Mode</span>
        </div>
        <USwitch v-model="isDark" />
      </div>

      <!-- Default Activity -->
      <button
        class="w-full p-4 rounded-xl bg-elevated flex items-center justify-between hover:bg-muted/10 transition-colors"
        @click="showDefaultActivityModal = true"
      >
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-home" class="w-5 h-5 text-muted" />
          <span>Default Activity</span>
        </div>
        <div class="flex items-center gap-2 text-muted">
          <UIcon
            v-if="defaultActivity"
            :name="defaultActivity.icon || 'i-lucide-circle'"
            class="w-4 h-4"
            :style="{ color: defaultActivity.color || '#6366f1' }"
          />
          <span>{{ defaultActivity?.name || 'Not set' }}</span>
          <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
        </div>
      </button>

      <!-- Notifications (placeholder) -->
      <div class="p-4 rounded-xl bg-elevated flex items-center justify-between opacity-50">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-bell" class="w-5 h-5 text-muted" />
          <span>Notifications</span>
        </div>
        <span class="text-sm text-muted">Coming soon</span>
      </div>

      <!-- Data Export (placeholder) -->
      <div class="p-4 rounded-xl bg-elevated flex items-center justify-between opacity-50">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-download" class="w-5 h-5 text-muted" />
          <span>Export Data</span>
        </div>
        <span class="text-sm text-muted">Coming soon</span>
      </div>

      <!-- Logout -->
      <button
        class="w-full p-4 rounded-xl bg-error/10 text-error flex items-center gap-3 hover:bg-error/20 transition-colors"
        @click="showLogoutModal = true"
      >
        <UIcon name="i-lucide-log-out" class="w-5 h-5" />
        <span>Log out</span>
      </button>
    </div>

    <!-- App Info -->
    <div class="mt-8 text-center text-sm text-muted">
      <p>TimeFlow v1.0.0</p>
      <p class="mt-1">Made with ❤️ using Nuxt</p>
    </div>

    <!-- Profile Modal -->
    <UModal v-model:open="showProfileModal" title="Edit Profile" :description="' '">
      <UButton
        icon="i-lucide-user"
        label="Profile"
        class="hidden"
      />

      <template #body>
        <div class="space-y-6">
          <!-- Avatar preview -->
          <div class="flex justify-center">
            <div
              class="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold transition-colors"
              :style="{ backgroundColor: `${editAccentColor}30`, color: editAccentColor }"
            >
              {{ (editName || displayName).charAt(0).toUpperCase() }}
            </div>
          </div>

          <!-- Name input -->
          <UInput
            v-model="editName"
            label="Display Name"
            placeholder="Your name"
          />

          <!-- Accent color -->
          <div>
            <label class="block text-sm font-medium mb-3">Accent Color</label>
            <div class="grid grid-cols-5 gap-3 justify-center">
              <button
                v-for="color in accentColorOptions"
                :key="color.hex"
                class="w-10 h-10 rounded-full border-2 transition-all hover:scale-110 mx-auto"
                :class="editAccentColor === color.hex ? 'scale-110 ring-2 ring-offset-2 ring-offset-default' : 'border-transparent'"
                :style="{ backgroundColor: color.hex, borderColor: editAccentColor === color.hex ? 'white' : 'transparent', '--tw-ring-color': color.hex }"
                :title="color.name"
                @click="editAccentColor = color.hex"
              />
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="flex-1"
            :disabled="isLoading"
            @click="showProfileModal = false"
          />
          <UButton
            label="Save"
            color="primary"
            class="flex-1"
            :loading="isLoading"
            @click="saveProfile"
          />
        </div>
      </template>
    </UModal>

    <!-- Default Activity Modal -->
    <UModal v-model:open="showDefaultActivityModal" title="Default Activity" :description="' '">
      <UButton
        icon="i-lucide-home"
        label="Default"
        class="hidden"
      />

      <template #body>
        <p class="text-muted mb-4">
          The default activity is what you switch to when you want to stop tracking or start fresh.
        </p>
        <div class="space-y-2 max-h-[50vh] overflow-y-auto">
          <button
            v-for="activity in activities"
            :key="activity.id"
            class="w-full p-3 rounded-xl flex items-center gap-3 transition-colors"
            :class="activity.isDefault ? 'bg-primary/20 ring-2 ring-primary' : 'bg-elevated hover:bg-muted/10'"
            :disabled="isLoading"
            @click="setDefaultActivity(activity.id)"
          >
            <UIcon
              :name="activity.icon || 'i-lucide-circle'"
              class="w-5 h-5"
              :style="{ color: activity.color || '#6366f1' }"
            />
            <span class="flex-1 text-left">{{ activity.name }}</span>
            <UIcon
              v-if="activity.isDefault"
              name="i-lucide-check"
              class="w-5 h-5 text-primary"
            />
          </button>
        </div>
      </template>
    </UModal>

    <!-- Logout Confirmation -->
    <UModal v-model:open="showLogoutModal" title="Log out?" :description="' '">
      <UButton
        icon="i-lucide-log-out"
        label="Logout"
        color="error"
        class="hidden"
      />

      <template #body>
        <p>Are you sure you want to log out?</p>
        <p class="text-sm text-muted mt-2">Any unsynced data will be preserved locally.</p>
      </template>

      <template #footer>
        <div class="flex gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="flex-1"
            @click="showLogoutModal = false"
          />
          <UButton
            label="Log out"
            color="error"
            class="flex-1"
            @click="handleLogout"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
