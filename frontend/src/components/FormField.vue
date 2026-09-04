<script setup lang="ts">
defineProps<{
  label: string;
  hint?: string;
  required?: boolean;
}>();
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-slate-200 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-400">*</span>
    </label>
    <p v-if="hint" class="text-xs text-slate-500 mb-1.5">{{ hint }}</p>
    <slot />
  </div>
</template>
