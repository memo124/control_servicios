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

    <p v-if="result" class="text-success mb-4">{{ result.enqueued }} correos encolados</p>

    <h2 class="font-semibold mb-3">Pendientes de envío ({{ pendientes.length }})</h2>
    <div class="space-y-2 mb-8">
      <div v-for="(p, i) in pendientes" :key="i" class="card flex justify-between items-center text-sm">
        <div>
          <span class="font-medium">{{ (p as any).cliente_nombre }}</span>
          <span class="text-themed-muted ml-2">{{ (p as any).plataforma }}</span>
        </div>
        <EstadoBadge
          :label="(p as any).estado_codigo"
          :codigo="(p as any).estado_codigo"
          :nombre="(p as any).estado_nombre"
          :color-hex="(p as any).color_hex"
        />
      </div>
      <p v-if="pendientes.length === 0" class="text-themed-muted">No hay notificaciones pendientes.</p>
    </div>

    <h2 class="font-semibold mb-3">Historial reciente</h2>
    <div class="table-wrap card card-flush">
      <table class="data-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in historial" :key="(h as any).id">
            <td>{{ (h as any).email }}</td>
            <td :class="(h as any).estadoEnvio === 'enviado' ? 'text-success' : 'text-cost'">
              {{ (h as any).estadoEnvio }}
            </td>
            <td class="text-themed-muted">{{ new Date((h as any).createdAt).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
