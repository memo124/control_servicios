<script setup lang="ts">
defineProps<{ title: string; value: string | number; subtitle?: string; color?: string }>();
</script>

<template>
  <div class="card">
    <p class="text-sm text-slate-400">{{ title }}</p>
    <p class="text-2xl md:text-3xl font-bold mt-1" :class="color ?? 'text-white'">{{ value }}</p>
    <p v-if="subtitle" class="text-xs text-slate-500 mt-1">{{ subtitle }}</p>
  </div>
</template>
