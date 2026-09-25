<script setup lang="ts">
import type { PokemonDetail } from '#shared/types'

const route = useRoute()
const name = computed(() => String(route.params.name))

// Return to the browse view we came from: the page/search/type carried in the
// query (see PokemonCard). Empty when the page was opened directly, so we land
// on the default browse view.
const backTo = computed(() => ({ path: '/', query: route.query }))

// Keyed by the route param so navigating between Pokémon refetches.
const { data, status, error } = await useFetch<PokemonDetail>(
  () => `/api/pokemon/${route.params.name}`,
)

const notFound = computed(() => error.value?.statusCode === 404)
</script>

<template>
  <div>
    <UButton :to="backTo" variant="link" color="neutral" class="mb-4 px-0"
      >← Back to browse</UButton
    >

    <!-- Not found -->
    <div v-if="notFound" class="py-16 text-center">
      <p class="text-lg font-medium">No Pokémon called “{{ name }}”.</p>
      <p class="mt-1 text-muted">Check the spelling or head back to browse.</p>
    </div>

    <!-- Other errors -->
    <div v-else-if="error" class="py-16 text-center text-muted">
      Something went wrong loading this Pokémon.
    </div>

    <!-- Loading -->
    <div v-else-if="status === 'pending' || !data" class="flex flex-col gap-4">
      <USkeleton class="h-8 w-48" />
      <USkeleton class="h-40 w-40" />
      <USkeleton class="h-24 w-full max-w-md" />
    </div>

    <!-- Detail -->
    <article v-else class="flex flex-col gap-6 md:flex-row md:items-start">
      <div class="flex flex-shrink-0 gap-4">
        <img
          v-if="data.spriteUrl"
          :src="data.spriteUrl"
          :alt="data.name"
          width="160"
          height="160"
          class="h-40 w-40"
        />
        <ShinyImage
          v-if="data.hasShinyForm && data.shinySpriteUrl"
          :src="data.shinySpriteUrl"
          :name="data.name"
        />
      </div>

      <div class="space-y-4">
        <div class="space-y-2">
          <div>
            <h1 class="text-3xl font-bold capitalize">{{ data.name }}</h1>
            <p v-if="data.genus" class="text-muted">{{ data.genus }}</p>
          </div>
          <div class="flex gap-1">
            <TypeBadge v-for="t in data.types" :key="t" :type="t" />
          </div>
          <CatchButton :pokemon-id="data.id" :name="data.name" :sprite-url="data.spriteUrl" />
        </div>

        <p v-if="data.description" class="max-w-prose leading-relaxed text-pretty">
          {{ data.description }}
        </p>

        <dl class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <dt class="text-muted">Height</dt>
            <dd class="font-medium">{{ data.heightM }} m</dd>
          </div>
          <div>
            <dt class="text-muted">Weight</dt>
            <dd class="font-medium">{{ data.weightKg }} kg</dd>
          </div>
        </dl>

        <div>
          <h2 class="text-sm font-semibold text-muted">Abilities</h2>
          <ul class="mt-1 space-y-1">
            <li v-for="a in data.abilities" :key="a.name" class="capitalize">
              {{ a.name }}
              <UBadge v-if="a.isHidden" size="sm" color="neutral" variant="subtle">hidden</UBadge>
            </li>
          </ul>
        </div>
      </div>
    </article>
  </div>
</template>
