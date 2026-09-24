<script setup lang="ts">
import { POKEMON_TYPES } from '#shared/pokemon'

// Drives the `type` filter. "All" maps to an empty value (no filter).
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const ALL = 'all'
const items = [ALL, ...POKEMON_TYPES]

const model = computed({
  get: () => props.modelValue || ALL,
  set: (v: string) => emit('update:modelValue', v === ALL ? '' : v),
})
</script>

<template>
  <USelect v-model="model" :items="items" class="w-40 capitalize" />
</template>
