<script setup lang="ts">
// Protected: the auth middleware redirects anonymous visitors to /login.
definePageMeta({ middleware: 'auth' })

const store = useCollectionStore()

// Hydrate client-side (per-user, behind auth — no SSR/SEO need).
onMounted(() => store.hydrate())
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-baseline justify-between">
      <h1 class="text-2xl font-bold">My Collection</h1>
      <span v-if="store.hydrated && store.entries.length" class="text-sm text-muted">
        {{ store.entries.length }} caught
      </span>
    </div>

    <!-- Loading -->
    <div v-if="!store.hydrated" class="grid gap-3 lg:grid-cols-2">
      <USkeleton v-for="n in 6" :key="n" class="h-24 w-full rounded-lg" />
    </div>

    <!-- Empty -->
    <div v-else-if="!store.entries.length" class="py-16 text-center">
      <p class="text-muted">No Pokémon caught yet.</p>
      <UButton to="/" class="mt-3">Browse Pokémon</UButton>
    </div>

    <!-- Collection -->
    <div v-else class="grid gap-3 lg:grid-cols-2">
      <CollectionItem v-for="e in store.entries" :key="e.pokemonId" :entry="e" />
    </div>
  </div>
</template>
