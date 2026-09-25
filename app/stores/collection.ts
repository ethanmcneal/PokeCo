import { defineStore } from 'pinia'
import type { CollectionEntry } from '#shared/types'

// Holds the user's collection so "caught" state is shared reactively across the
// grid, detail view, header, and collection page. Mutations are optimistic and
// roll back on failure (specs/05-frontend-ux.md). Hydrated client-side (the
// collection is per-user and behind auth, so there's no SSR/SEO need).
export const useCollectionStore = defineStore('collection', () => {
  const entries = ref<CollectionEntry[]>([])
  const hydrated = ref(false)
  let inflight: Promise<void> | null = null

  const caughtIds = computed(() => new Set(entries.value.map((e) => e.pokemonId)))
  const isCaught = (pokemonId: number): boolean => caughtIds.value.has(pokemonId)

  async function hydrate(): Promise<void> {
    if (hydrated.value) return
    // De-dupe concurrent hydrations (many CatchButtons mount at once).
    if (!inflight) {
      inflight = $fetch<CollectionEntry[]>('/api/collection')
        .then((data) => {
          entries.value = data
          hydrated.value = true
        })
        .finally(() => {
          inflight = null
        })
    }
    return inflight
  }

  function reset(): void {
    entries.value = []
    hydrated.value = false
  }

  async function catchPokemon(input: {
    pokemonId: number
    name: string
    spriteUrl: string | null
  }): Promise<void> {
    if (isCaught(input.pokemonId)) return
    // Optimistic insert (provisional caughtAt), reconcile with the server row.
    const optimistic: CollectionEntry = {
      pokemonId: input.pokemonId,
      pokemonName: input.name,
      spriteUrl: input.spriteUrl,
      caughtAt: new Date().toISOString(),
    }
    entries.value = [optimistic, ...entries.value]
    try {
      const saved = await $fetch<CollectionEntry>('/api/collection', {
        method: 'POST',
        body: { pokemonId: input.pokemonId },
      })
      entries.value = entries.value.map((e) => (e.pokemonId === saved.pokemonId ? saved : e))
    } catch (err) {
      entries.value = entries.value.filter((e) => e.pokemonId !== input.pokemonId)
      throw err
    }
  }

  async function release(pokemonId: number): Promise<void> {
    const previous = entries.value
    entries.value = entries.value.filter((e) => e.pokemonId !== pokemonId)
    try {
      await $fetch(`/api/collection/${pokemonId}`, { method: 'DELETE' })
    } catch (err) {
      entries.value = previous // rollback
      throw err
    }
  }

  return { entries, hydrated, caughtIds, isCaught, hydrate, reset, catchPokemon, release }
})
