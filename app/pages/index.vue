<script setup lang="ts">
import type { Page, PokemonListItem } from '#shared/types'

// Browse/search/filter. All state (page, search, type) lives in the URL query so
// the view is shareable and back/forward-safe (AC-1.2); useFetch reacts to it.
const PAGE_SIZE = 24

const route = useRoute()
const router = useRouter()

const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const search = computed(() => (route.query.q as string) || '')
const type = computed(() => (route.query.type as string) || '')

const query = computed(() => ({
  limit: PAGE_SIZE,
  offset: (page.value - 1) * PAGE_SIZE,
  ...(search.value ? { search: search.value } : {}),
  ...(type.value ? { type: type.value } : {}),
}))

const { data, status, error, refresh } = await useFetch<Page<PokemonListItem>>('/api/pokemon', {
  query,
})

// Merge a patch into the URL query, dropping empty values. Changing the search
// or type resets pagination to page 1.
function updateQuery(patch: Record<string, string | number | undefined>, resetPage = false) {
  const merged: Record<string, unknown> = { ...route.query, ...patch }
  if (resetPage) merged.page = undefined
  const next: Record<string, string> = {}
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null && v !== '') next[k] = String(v)
  }
  router.push({ query: next })
}

const searchModel = computed({
  get: () => search.value,
  set: (v: string) => updateQuery({ q: v || undefined }, true),
})
const typeModel = computed({
  get: () => type.value,
  set: (v: string) => updateQuery({ type: v || undefined }, true),
})
const pageModel = computed({
  get: () => page.value,
  set: (p: number) => updateQuery({ page: p === 1 ? undefined : p }),
})

const total = computed(() => data.value?.total ?? 0)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold">Browse Pokémon</h1>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchBar v-model="searchModel" />
        <TypeFilter v-model="typeModel" />
      </div>
    </div>

    <PokemonGrid
      :items="data?.items ?? []"
      :pending="status === 'pending'"
      :error="!!error"
      @retry="refresh"
    />

    <div v-if="total > PAGE_SIZE" class="flex justify-center">
      <UPagination v-model:page="pageModel" :total="total" :items-per-page="PAGE_SIZE" />
    </div>
  </div>
</template>
