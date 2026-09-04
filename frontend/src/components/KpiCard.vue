<script setup lang="ts">
defineProps<{ title: string; value: string | number; subtitle?: string; color?: string }>();
</script>

<template>
  <div class="card">
    <p class="text-sm text-themed-muted">{{ title }}</p>
    <p class="text-2xl md:text-3xl font-bold mt-1" :class="color ?? 'text-themed-primary'">{{ value }}</p>
    <p v-if="subtitle" class="text-xs text-themed-muted mt-1">{{ subtitle }}</p>
  </div>
</template>
