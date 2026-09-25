<script setup lang="ts">
// Toggle catch/release for one Pokémon. Optimistic via the store; prompts login
// when logged out; shows a confirmation toast + a brief pop on catch (the pop is
// gated on prefers-reduced-motion in main.css). AC-5.1, AC-5.4.
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

async function onClick() {
  if (!loggedIn.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  if (pending.value) return
  pending.value = true
  try {
    if (caught.value) {
      await store.release(props.pokemonId)
    } else {
      await store.catchPokemon({
        pokemonId: props.pokemonId,
        name: props.name,
        spriteUrl: props.spriteUrl,
      })
      popping.value = true
      setTimeout(() => (popping.value = false), 600)
      toast.add({ title: `Gotcha! ${props.name} was caught.`, color: 'success' })
    }
  } catch {
    toast.add({ title: 'Something went wrong. Please try again.', color: 'error' })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UButton
    :color="caught ? 'neutral' : 'primary'"
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
