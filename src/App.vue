<template>
  <RouterView v-slot="{ Component }">
    <component :is="Component" />
  </RouterView>

  <ToastHost />
  <ConfirmHost />
</template>

<script setup>
import { RouterView } from 'vue-router'
import ToastHost from '@/components/ToastHost.vue'
import ConfirmHost from '@/components/ConfirmHost.vue'
</script>
