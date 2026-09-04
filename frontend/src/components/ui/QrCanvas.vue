<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { drawQrToCanvas } from '@/utils/qr';

const props = defineProps<{
  value: string;
  size?: number;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

function render() {
  if (!canvasRef.value || !props.value) return;
  drawQrToCanvas(canvasRef.value, props.value);
}

onMounted(render);
watch(() => props.value, render);
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="size ?? 220"
    :height="size ?? 220"
    class="rounded-lg border border-themed mx-auto block"
    role="img"
    :aria-label="`Código QR: ${value}`"
  />
</template>
