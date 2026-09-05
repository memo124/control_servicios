<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import OfflineBanner from '@/components/ui/OfflineBanner.vue';
import { useThemeStore } from '@/stores/theme';
import { useNetworkStore } from '@/stores/network';

const theme = useThemeStore();
const network = useNetworkStore();

onMounted(() => {
  theme.init();
  network.init();
});

onUnmounted(() => network.destroy());
</script>

<template>
  <OfflineBanner />
  <RouterView />
  <ToastContainer />
  <ConfirmDialog />
</template>
