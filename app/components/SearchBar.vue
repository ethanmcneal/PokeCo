<script setup lang="ts">
// Debounced search input. Value is driven by the URL (one-way in), and changes
// are emitted trimmed after a short delay so we don't refetch on every keystroke.
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const local = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => {
    if (v !== local.value) local.value = v
  },
)

let timer: ReturnType<typeof setTimeout> | undefined
watch(local, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => emit('update:modelValue', v.trim()), 300)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <UInput v-model="local" placeholder="Search by name…" class="w-full sm:w-64" />
</template>
