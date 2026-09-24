<script setup lang="ts">
const route = useRoute()
const name = computed(() => String(route.params.name))
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold capitalize">{{ name }}</h1>
    <p class="mt-2 text-muted">Detail view arrives in Phase 8.</p>
  </div>
</template>
