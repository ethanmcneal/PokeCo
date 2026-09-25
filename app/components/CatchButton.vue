<script setup lang="ts">
// Toggle catch/release for one Pokémon. Optimistic via the store; prompts login
// when logged out; shows a confirmation toast + a brief pop on catch (the pop is
// gated on prefers-reduced-motion in main.css). Releasing asks for confirmation
// inline, matching the collection page. AC-5.1, AC-5.4.
const props = defineProps<{ pokemonId: number; name: string; spriteUrl: string | null }>()

const { loggedIn } = useUserSession()
const store = useCollectionStore()
const toast = useToast()
const route = useRoute()

onMounted(() => {
  if (loggedIn.value) store.hydrate()
})

const caught = computed(() => store.isCaught(props.pokemonId))
const pending = ref(false)
const popping = ref(false)
const confirming = ref(false)

async function onCatch() {
  pending.value = true
  try {
    await store.catchPokemon({
      pokemonId: props.pokemonId,
      name: props.name,
      spriteUrl: props.spriteUrl,
    })
    popping.value = true
    setTimeout(() => (popping.value = false), 600)
    toast.add({ title: `Gotcha! ${props.name} was caught.`, color: 'success' })
  } catch {
    toast.add({ title: 'Something went wrong. Please try again.', color: 'error' })
  } finally {
    pending.value = false
  }
}

async function onReleaseConfirmed() {
  pending.value = true
  try {
    await store.release(props.pokemonId)
  } catch {
    toast.add({ title: 'Something went wrong. Please try again.', color: 'error' })
  } finally {
    pending.value = false
    confirming.value = false
  }
}

// The primary button: catch immediately, but ask before releasing.
async function onClick() {
  if (!loggedIn.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  if (pending.value) return
  if (caught.value) confirming.value = true
  else await onCatch()
}
</script>

<template>
  <!-- Inline release confirmation, mirroring CollectionItem: the caught button is
       replaced in place by an explicit yes/cancel pair. -->
  <div v-if="confirming" class="flex flex-col items-center gap-1">
    <span class="text-sm text-muted">Release?</span>
    <div class="flex items-center gap-2">
      <UButton
        color="error"
        variant="soft"
        size="sm"
        :loading="pending"
        @click.stop.prevent="onReleaseConfirmed"
      >
        Release
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="pending"
        @click.stop.prevent="confirming = false"
      >
        Cancel
      </UButton>
    </div>
  </div>

  <UButton
    v-else
    :color="caught ? 'neutral' : 'secondary'"
    :variant="caught ? 'soft' : 'solid'"
    :loading="pending"
    :class="popping ? 'animate-pop' : ''"
    :aria-label="caught ? `Caught ${name}` : `Catch ${name}`"
    size="sm"
    @click.stop.prevent="onClick"
  >
    {{ caught ? 'Caught ✓' : 'Catch' }}
  </UButton>
</template>
