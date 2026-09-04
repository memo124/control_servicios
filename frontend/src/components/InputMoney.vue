<script setup lang="ts">
defineProps<{
  modelValue: number | string;
  placeholder?: string;
  min?: number | string;
  step?: number | string;
  required?: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: number];
}>();
</script>

<template>
  <div class="input-group">
    <span class="input-addon" aria-hidden="true">$</span>
    <input
      class="input input-group-field"
      type="number"
      :value="modelValue"
      :placeholder="placeholder"
      :min="min"
      :step="step"
      :required="required"
      :disabled="disabled"
      @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />
  </div>
</template>
