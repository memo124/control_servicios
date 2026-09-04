<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/services/api';

interface VersionInfo { app: string; node: string }
interface ChangelogEntry { id: number; version: string; titulo: string; descripcion: string | null; tipo: string; createdAt: string }

const version = ref<VersionInfo | null>(null);
const changelog = ref<ChangelogEntry[]>([]);

onMounted(async () => {
  const [v, c] = await Promise.all([
    api.get('/system/version'),
    api.get('/system/changelog'),
  ]);
  version.value = v.data;
  changelog.value = c.data;
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Versión del Sistema</h1>

    <div v-if="version" class="card mb-8 inline-block">
      <p class="text-sm text-slate-400">Versión actual</p>
      <p class="text-3xl font-bold text-indigo-400">v{{ version.app }}</p>
      <p class="text-xs text-slate-500 mt-1">Node {{ version.node }}</p>
    </div>

    <h2 class="font-semibold mb-4">Historial de actualizaciones</h2>
    <div class="space-y-4">
      <div v-for="entry in changelog" :key="entry.id" class="card border-l-4" :class="{
        'border-indigo-500': entry.tipo === 'major',
        'border-blue-500': entry.tipo === 'minor',
        'border-slate-500': entry.tipo === 'patch',
      }">
        <div class="flex items-center gap-3">
          <span class="font-mono text-indigo-300">v{{ entry.version }}</span>
          <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">{{ entry.tipo }}</span>
          <span class="text-xs text-slate-500">{{ new Date(entry.createdAt).toLocaleDateString() }}</span>
        </div>
        <h3 class="font-medium mt-2">{{ entry.titulo }}</h3>
        <p v-if="entry.descripcion" class="text-sm text-slate-400 mt-1">{{ entry.descripcion }}</p>
      </div>
    </div>
  </div>
</template>
