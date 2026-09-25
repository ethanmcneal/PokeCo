<script setup lang="ts">
// Auth-aware navigation. Session truth comes from nuxt-auth-utils' useUserSession
// (available during SSR), so the correct nav renders on first paint.
const { loggedIn, user, clear } = useUserSession()
const collection = useCollectionStore()

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  collection.reset()
  await navigateTo('/login')
}
</script>

<template>
  <header class="border-b border-default bg-elevated/50 backdrop-blur">
    <UContainer class="flex items-center justify-between gap-4 py-3">
      <NuxtLink to="/" class="text-lg font-bold">PokéCo</NuxtLink>

      <nav class="flex items-center gap-2">
        <UButton to="/" variant="ghost" color="neutral">Browse</UButton>

        <template v-if="loggedIn">
          <UButton to="/collection" variant="ghost" color="neutral">My Collection</UButton>
          <span class="hidden text-sm text-muted sm:inline">{{ user?.email }}</span>
          <UButton color="neutral" variant="soft" @click="logout">Log out</UButton>
        </template>
        <template v-else>
          <UButton to="/login" variant="ghost" color="neutral">Log in</UButton>
          <UButton to="/register" color="primary">Sign up</UButton>
        </template>
      </nav>
    </UContainer>
  </header>
</template>
