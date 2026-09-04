<script setup lang="ts">
defineProps<{
  label: string;
  hint?: string;
  required?: boolean;
}>();
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-themed-primary mb-1">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <p v-if="hint" class="text-xs text-themed-muted mb-1.5">{{ hint }}</p>
    <slot />
  </div>
</template>
