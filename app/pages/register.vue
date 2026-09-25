<script setup lang="ts">
const { loggedIn } = useUserSession()
if (loggedIn.value) await navigateTo('/')
</script>

<template>
  <AuthForm mode="register" />
</template>
