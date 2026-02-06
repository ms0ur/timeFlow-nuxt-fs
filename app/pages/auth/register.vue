<script setup lang="ts">
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const { register } = useAuth()
const toast = useToast()

const isLoading = ref(false)

const fields: AuthFormField[] = [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'you@example.com',
    required: true
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'At least 8 characters',
    required: true
  },
  {
    name: 'confirmPassword',
    type: 'password',
    label: 'Confirm Password',
    placeholder: 'Confirm your password',
    required: true
  }
]

interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
}

async function onSubmit(event: FormSubmitEvent<RegisterForm>) {
  if (event.data.password !== event.data.confirmPassword) {
    toast.add({
      title: 'Passwords do not match',
      color: 'error'
    })
    return
  }

  if (event.data.password.length < 8) {
    toast.add({
      title: 'Password too short',
      description: 'Password must be at least 8 characters',
      color: 'error'
    })
    return
  }

  isLoading.value = true

  try {
    await register(event.data.email, event.data.password)
    toast.add({
      title: 'Account created!',
      description: 'Welcome to TimeFlow',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Registration failed',
      description: error.message || 'Something went wrong',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UPageCard>
    <UAuthForm
      title="Create account"
      description="Start tracking your time with TimeFlow"
      icon="i-lucide-user-plus"
      :fields="fields"
      :loading="isLoading"
      submit-label="Create account"
      @submit="onSubmit"
    >
      <template #footer>
        <p class="text-center text-sm text-muted">
          Already have an account?
          <NuxtLink to="/auth/login" class="text-primary hover:underline">
            Sign in
          </NuxtLink>
        </p>
      </template>
    </UAuthForm>
  </UPageCard>
</template>
