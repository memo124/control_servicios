<script setup lang="ts">
import { Sun, Moon, Monitor } from 'lucide-vue-next';
import { useThemeStore, type ThemeMode } from '@/stores/theme';

const theme = useThemeStore();

const modes: { id: ThemeMode; icon: typeof Sun; label: string }[] = [
  { id: 'light', icon: Sun, label: 'Claro' },
  { id: 'dark', icon: Moon, label: 'Oscuro' },
  { id: 'system', icon: Monitor, label: 'Sistema' },
];
</script>

<template>
  <div class="flex items-center gap-1 p-1 rounded-lg bg-themed-surface border border-themed">
    <button
      v-for="m in modes"
      :key="m.id"
      type="button"
      :class="[
        'p-2 rounded-md transition-colors',
        theme.mode === m.id ? 'bg-indigo-600 text-white' : 'text-themed-muted hover:text-themed-primary',
      ]"
      :title="m.label"
      :aria-label="`Tema ${m.label}`"
      @click="theme.setMode(m.id)"
    >
      <component :is="m.icon" class="w-4 h-4" />
    </button>
  </div>
</template>
