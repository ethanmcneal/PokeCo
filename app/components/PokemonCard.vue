<script setup lang="ts">
import type { PokemonListItem } from '#shared/types'

defineProps<{ pokemon: PokemonListItem }>()
</script>

<template>
  <NuxtLink :to="`/pokemon/${pokemon.name}`" class="block">
    <UCard class="h-full transition hover:ring-2 hover:ring-primary">
      <div class="flex flex-col items-center gap-2 text-center">
        <img
          v-if="pokemon.spriteUrl"
          :src="pokemon.spriteUrl"
          :alt="pokemon.name"
          width="96"
          height="96"
          loading="lazy"
          class="h-24 w-24"
        />
        <div v-else class="flex h-24 w-24 items-center justify-center text-xs text-muted">
          no image
        </div>
        <span class="font-medium capitalize">{{ pokemon.name }}</span>
        <div class="flex flex-wrap justify-center gap-1">
          <TypeBadge v-for="t in pokemon.types" :key="t" :type="t" />
        </div>
      </div>
    </UCard>
  </NuxtLink>
</template>
