<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';

interface VersionInfo { app: string; node: string }
interface ChangelogEntry { id: number; version: string; titulo: string; descripcion: string | null; tipo: string; createdAt: string }

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();
const version = ref<VersionInfo | null>(null);
const changelog = ref<ChangelogEntry[]>([]);
const downloadingBackup = ref(false);

onMounted(async () => {
  const [v, c] = await Promise.all([
    api.get('/system/version'),
    api.get('/system/changelog'),
  ]);
  version.value = v.data;
  changelog.value = c.data;
});

async function downloadBackup() {
  const ok = await confirm({
    title: 'Descargar backup de BD',
    message:
      'Se generará un archivo .sql con esquema y datos. Se notificará al grupo de Telegram del equipo. ¿Continuar?',
    confirmText: 'Descargar',
    variant: 'warning',
  });
  if (!ok) return;

  downloadingBackup.value = true;
  try {
    const { data, headers } = await api.get('/system/backup', {
      responseType: 'blob',
      timeout: 120_000,
    });
    const disposition = headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `control_servicios_db_${Date.now()}.sql`;
    const url = URL.createObjectURL(data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Backup descargado', 'Se envió aviso al grupo de Telegram');
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast.error('Error', msg ?? 'No se pudo generar el backup');
  } finally {
    downloadingBackup.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Versión del Sistema</h1>

    <div v-if="version" class="card mb-8 inline-block">
      <p class="text-sm text-themed-muted">Versión actual</p>
      <p class="text-3xl font-bold text-brand">v{{ version.app }}</p>
      <p class="text-xs text-themed-muted mt-1">Node {{ version.node }}</p>
    </div>

    <div v-if="auth.hasPermission('usuarios.gestionar')" class="card mb-8 border-amber-500/40 max-w-xl">
      <h2 class="font-semibold text-amber-400 mb-2">Backup de base de datos</h2>
      <p class="text-sm text-themed-muted mb-4">
        Descarga un respaldo SQL completo (esquema + datos). Al descargarlo se publica un aviso en el
        grupo de Telegram para los administradores.
      </p>
      <button class="btn-primary" :disabled="downloadingBackup" @click="downloadBackup">
        {{ downloadingBackup ? 'Generando backup…' : 'Descargar backup .sql' }}
      </button>
    </div>

    <h2 class="font-semibold mb-4">Historial de actualizaciones</h2>
    <div class="space-y-4">
      <div v-for="entry in changelog" :key="entry.id" class="card border-l-4" :class="{
        'border-indigo-500': entry.tipo === 'major',
        'border-blue-500': entry.tipo === 'minor',
        'border-themed': entry.tipo === 'patch',
      }">
        <div class="flex items-center gap-3">
          <span class="font-mono text-brand">v{{ entry.version }}</span>
          <span class="tag-pill">{{ entry.tipo }}</span>
          <span class="text-xs text-themed-muted">{{ new Date(entry.createdAt).toLocaleDateString() }}</span>
        </div>
        <h3 class="font-medium mt-2">{{ entry.titulo }}</h3>
        <p v-if="entry.descripcion" class="text-sm text-themed-muted mt-1">{{ entry.descripcion }}</p>
      </div>
    </div>
  </div>
</template>
