<script setup lang="ts">
import type { PokemonListItem } from '#shared/types'

defineProps<{
  items: PokemonListItem[]
  pending: boolean
  error: boolean
}>()

defineEmits<{ retry: [] }>()

const gridClass = 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
</script>

<template>
  <!-- Error state with retry -->
  <div v-if="error" class="flex flex-col items-center gap-3 py-16 text-center">
    <p class="text-muted">Something went wrong loading Pokémon.</p>
    <UButton color="neutral" variant="soft" @click="$emit('retry')">Try again</UButton>
  </div>

  <!-- Loading skeletons -->
  <div v-else-if="pending" :class="gridClass">
    <USkeleton v-for="n in 12" :key="n" class="h-44 w-full rounded-lg" />
  </div>

  <!-- Empty state -->
  <div v-else-if="!items.length" class="py-16 text-center text-muted">No Pokémon found.</div>

  <!-- Results -->
  <div v-else :class="gridClass">
    <PokemonCard v-for="p in items" :key="p.id" :pokemon="p" />
  </div>
</template>
