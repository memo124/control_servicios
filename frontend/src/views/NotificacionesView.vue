<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import EstadoBadge from '@/components/EstadoBadge.vue';

const pendientes = ref<unknown[]>([]);
const historial = ref<unknown[]>([]);
const running = ref(false);
const result = ref<{ enqueued: number } | null>(null);

async function load() {
  const [p, h] = await Promise.all([
    api.get('/notificaciones/pendientes'),
    api.get('/notificaciones/historial'),
  ]);
  pendientes.value = p.data;
  historial.value = h.data;
}

async function ejecutar() {
  running.value = true;
  try {
    const { data } = await api.post('/notificaciones/ejecutar');
    result.value = data;
    await load();
  } finally {
    running.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <h1 class="text-2xl font-bold">Notificaciones</h1>
      <button class="btn-primary" :disabled="running" @click="ejecutar">
        {{ running ? 'Ejecutando...' : 'Ejecutar envío manual' }}
      </button>
    </div>

    <p v-if="result" class="text-emerald-400 mb-4">{{ result.enqueued }} correos encolados</p>

    <h2 class="font-semibold mb-3">Pendientes de envío ({{ pendientes.length }})</h2>
    <div class="space-y-2 mb-8">
      <div v-for="(p, i) in pendientes" :key="i" class="card flex justify-between items-center text-sm">
        <div>
          <span class="font-medium">{{ (p as any).cliente_nombre }}</span>
          <span class="text-slate-400 ml-2">{{ (p as any).plataforma }}</span>
        </div>
        <EstadoBadge
          :label="(p as any).estado_codigo"
          :codigo="(p as any).estado_codigo"
          :nombre="(p as any).estado_nombre"
          :color-hex="(p as any).color_hex"
        />
      </div>
      <p v-if="pendientes.length === 0" class="text-slate-500">No hay notificaciones pendientes.</p>
    </div>

    <h2 class="font-semibold mb-3">Historial reciente</h2>
    <div class="card !p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-800/50">
          <tr class="text-left text-slate-400">
            <th class="py-3 px-4">Email</th>
            <th class="py-3 px-4">Estado</th>
            <th class="py-3 px-4">Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in historial" :key="(h as any).id" class="border-t border-slate-800/50">
            <td class="py-3 px-4">{{ (h as any).email }}</td>
            <td class="py-3 px-4" :class="(h as any).estadoEnvio === 'enviado' ? 'text-emerald-400' : 'text-red-400'">
              {{ (h as any).estadoEnvio }}
            </td>
            <td class="py-3 px-4 text-slate-400">{{ new Date((h as any).createdAt).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
