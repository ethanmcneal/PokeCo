<script setup lang="ts">
// Renders a Pokémon's shiny sprite. Only mounted by the detail page when the
// shiny-form rule applies and a sprite exists (AC-3.4).
defineProps<{ src: string; name: string }>()
</script>

<template>
  <figure class="flex flex-col items-center gap-1">
    <div class="rounded-lg bg-elevated p-2 ring-1 ring-primary/40">
      <img :src="src" :alt="`Shiny ${name}`" width="120" height="120" class="h-30 w-30" />
    </div>
    <figcaption class="text-sm font-medium text-primary">✨ Shiny form</figcaption>
  </figure>
</template>
