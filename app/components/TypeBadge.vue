<script setup lang="ts">
import { typeColor } from '../utils/pokemonTypes'

const props = defineProps<{ type: string }>()
const color = computed(() => typeColor(props.type))
</script>

<template>
  <span
    class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize text-white"
    :style="{ backgroundColor: color }"
  >
    {{ type }}
  </span>
</template>
