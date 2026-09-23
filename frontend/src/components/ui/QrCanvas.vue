<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { drawQrToCanvas } from '@/utils/qr';
import { useThemeStore } from '@/stores/theme';

const props = defineProps<{
  value: string;
  size?: number;
}>();

const theme = useThemeStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const pixelSize = computed(() => props.size ?? 260);

async function render() {
  if (!canvasRef.value || !props.value) return;
  canvasRef.value.width = pixelSize.value;
  canvasRef.value.height = pixelSize.value;
  try {
    await drawQrToCanvas(canvasRef.value, props.value, 3);
  } catch {
    const ctx = canvasRef.value.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fef2f2';
      ctx.fillRect(0, 0, pixelSize.value, pixelSize.value);
    }
  }
}

onMounted(render);
watch(() => [props.value, pixelSize.value, theme.resolved] as const, render);
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="pixelSize"
    :height="pixelSize"
    class="rounded-lg border border-themed mx-auto block bg-white dark:bg-slate-900 p-1"
    role="img"
    :aria-label="`Código QR: ${value}`"
  />
</template>
