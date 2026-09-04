<script setup lang="ts">
defineProps<{
  label: string;
  codigo: string;
  nombre: string;
  colorHex: string;
}>();
</script>

<template>
  <span class="badge" :style="{ backgroundColor: colorHex }">{{ nombre }}</span>
</template>
