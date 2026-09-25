<script setup lang="ts">
import type { CollectionEntry } from '#shared/types'

const props = defineProps<{ entry: CollectionEntry }>()

const store = useCollectionStore()
const toast = useToast()
const releasing = ref(false)

async function onRelease() {
  releasing.value = true
  try {
    await store.release(props.entry.pokemonId)
  } catch {
    toast.add({ title: 'Could not release. Please try again.', color: 'error' })
  } finally {
    releasing.value = false
  }
}
</script>

<template>
  <UCard>
    <div class="flex items-center gap-3">
      <NuxtLink :to="`/pokemon/${entry.pokemonName}`" class="flex-shrink-0">
        <img
          v-if="entry.spriteUrl"
          :src="entry.spriteUrl"
          :alt="entry.pokemonName"
          width="64"
          height="64"
          class="h-16 w-16"
        />
      </NuxtLink>

      <div class="min-w-0 flex-1">
        <NuxtLink :to="`/pokemon/${entry.pokemonName}`" class="font-medium capitalize">
          {{ entry.pokemonName }}
        </NuxtLink>
        <p class="text-sm text-muted" :title="new Date(entry.caughtAt).toLocaleString()">
          Caught {{ formatRelativeTime(entry.caughtAt) }}
        </p>
      </div>

      <UButton color="neutral" variant="ghost" size="sm" :loading="releasing" @click="onRelease">
        Release
      </UButton>
    </div>
  </UCard>
</template>
