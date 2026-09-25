<script setup lang="ts">
import type { CollectionEntry } from '#shared/types'

const props = defineProps<{ entry: CollectionEntry }>()

const store = useCollectionStore()
const toast = useToast()
const confirming = ref(false)
const releasing = ref(false)

async function onRelease() {
  releasing.value = true
  try {
    await store.release(props.entry.pokemonId)
    // Success removes the entry from the store, so this item unmounts.
  } catch {
    toast.add({ title: 'Could not release. Please try again.', color: 'error' })
    confirming.value = false
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
        <NuxtLink
          :to="`/pokemon/${entry.pokemonName}`"
          class="block truncate font-medium capitalize"
        >
          {{ entry.pokemonName }}
        </NuxtLink>
        <p class="truncate text-sm text-muted" :title="new Date(entry.caughtAt).toLocaleString()">
          Caught {{ formatRelativeTime(entry.caughtAt) }}
        </p>
      </div>

      <!-- Inline confirmation: the Release button is replaced in place by an
           explicit yes/cancel pair, avoiding a heavier modal for a single item. -->
      <div class="flex flex-shrink-0 items-center gap-2">
        <template v-if="confirming">
          <span class="hidden text-sm text-muted sm:inline">Release?</span>
          <UButton color="error" variant="soft" size="sm" :loading="releasing" @click="onRelease">
            Yes, release
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="releasing"
            @click="confirming = false"
          >
            Cancel
          </UButton>
        </template>
        <UButton
          v-else
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="`Release ${entry.pokemonName}`"
          @click="confirming = true"
        >
          Release
        </UButton>
      </div>
    </div>
  </UCard>
</template>
