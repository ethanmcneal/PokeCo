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
      <div class="flex-shrink-0">
        <div v-if="confirming" class="flex flex-col items-center gap-1">
          <span class="text-sm text-muted">Release?</span>
          <div class="flex items-center gap-2">
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
          </div>
        </div>
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
