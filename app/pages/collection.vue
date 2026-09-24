<script setup lang="ts">
// Protected: the auth middleware redirects anonymous visitors to /login.
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">My Collection</h1>
    <p class="mt-2 text-muted">Collection view arrives in Phase 10.</p>
  </div>
</template>
