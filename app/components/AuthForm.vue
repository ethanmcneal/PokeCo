<script setup lang="ts">
// Shared by /login and /register. Posts to the auth API, refreshes the session,
// then returns to the page the user came from (validated to be a local path).
const props = defineProps<{ mode: 'login' | 'register' }>()

const { fetch: refreshSession } = useUserSession()
const route = useRoute()

const isRegister = computed(() => props.mode === 'register')
const state = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

// Only allow relative, non-protocol-relative redirects (open-redirect guard).
function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch(isRegister.value ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST',
      body: { email: state.email, password: state.password },
    })
    await refreshSession()
    await navigateTo(safeRedirect(route.query.redirect))
  } catch (e) {
    error.value =
      (e as { data?: { message?: string } })?.data?.message ??
      'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

// Preserve the redirect target when switching between login and register.
const redirectQuery = computed(() =>
  route.query.redirect ? { redirect: String(route.query.redirect) } : undefined,
)
</script>

<template>
  <UCard class="mx-auto mt-8 w-full max-w-sm">
    <template #header>
      <h1 class="text-xl font-bold">
        {{ isRegister ? 'Create your trainer account' : 'Welcome back' }}
      </h1>
    </template>

    <!-- `method="post"` matters only before hydration: without it a stray native
         submit would GET the current URL, putting the password in the query string
         (and browser history). The handler below owns the real submit. -->
    <form class="space-y-4" method="post" @submit.prevent="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" required class="w-full" />
      </UFormField>

      <UFormField
        label="Password"
        name="password"
        :hint="isRegister ? 'At least 8 characters' : undefined"
      >
        <UInput
          v-model="state.password"
          type="password"
          :autocomplete="isRegister ? 'new-password' : 'current-password'"
          required
          class="w-full"
        />
      </UFormField>

      <UAlert v-if="error" color="error" variant="soft" :description="error" />

      <UButton type="submit" :loading="loading" block>
        {{ isRegister ? 'Create account' : 'Log in' }}
      </UButton>
    </form>

    <template #footer>
      <p class="text-sm text-muted">
        <template v-if="isRegister">
          Already have an account?
          <ULink :to="{ path: '/login', query: redirectQuery }">Log in</ULink>
        </template>
        <template v-else>
          New here?
          <ULink :to="{ path: '/register', query: redirectQuery }">Create an account</ULink>
        </template>
      </p>
    </template>
  </UCard>
</template>
