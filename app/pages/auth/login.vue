<script setup lang="ts">
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const { login } = useAuth()
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
    placeholder: 'Your password',
    required: true
  }
]

interface LoginForm {
  email: string
  password: string
}

async function onSubmit(event: FormSubmitEvent<LoginForm>) {
  isLoading.value = true

  try {
    await login(event.data.email, event.data.password)
    toast.add({
      title: 'Welcome back!',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Login failed',
      description: error.message || 'Invalid email or password',
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
      title="Welcome back"
      description="Sign in to your TimeFlow account"
      icon="i-lucide-timer"
      :fields="fields"
      :loading="isLoading"
      @submit="onSubmit"
    >
      <template #footer>
        <p class="text-center text-sm text-muted">
          Don't have an account?
          <NuxtLink to="/auth/register" class="text-primary hover:underline">
            Sign up
          </NuxtLink>
        </p>
      </template>
    </UAuthForm>
  </UPageCard>
</template>
