<script setup lang="ts">
import { WifiOff } from 'lucide-vue-next';
import { useNetworkStore } from '@/stores/network';

const network = useNetworkStore();
</script>

<template>
  <div
    v-if="!network.isOnline"
    class="fixed top-0 inset-x-0 z-[100] bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-md"
    role="alert"
  >
    <WifiOff class="w-4 h-4 shrink-0" />
    <span>Sin conexión a internet — los cambios en formularios se guardan localmente hasta que vuelva la red.</span>
  </div>
</template>
