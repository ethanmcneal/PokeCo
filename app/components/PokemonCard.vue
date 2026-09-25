<script setup lang="ts">
import type { PokemonListItem } from '#shared/types'

defineProps<{ pokemon: PokemonListItem }>()
</script>

<template>
  <UCard class="h-full transition hover:ring-2 hover:ring-primary">
    <div class="flex flex-col items-center gap-2 text-center">
      <!-- Only the sprite + name navigate; the catch button is a separate control
           (avoids nesting an interactive button inside a link). -->
      <NuxtLink :to="`/pokemon/${pokemon.name}`" class="flex flex-col items-center gap-2">
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
      </NuxtLink>

      <div class="flex flex-wrap justify-center gap-1">
        <TypeBadge v-for="t in pokemon.types" :key="t" :type="t" />
      </div>

      <CatchButton :pokemon-id="pokemon.id" :name="pokemon.name" :sprite-url="pokemon.spriteUrl" />
    </div>
  </UCard>
</template>
