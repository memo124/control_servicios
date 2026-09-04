<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useThemeStore } from '@/stores/theme';

const theme = useThemeStore();
onMounted(() => theme.init());
</script>

<template>
  <RouterView />
  <ToastContainer />
  <ConfirmDialog />
</template>
