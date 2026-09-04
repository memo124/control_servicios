<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import KpiCard from '@/components/KpiCard.vue';

interface Resumen {
  costo_total_pagado: string;
  total_ingresos_clientes: string;
  ganancia_neta_total: string;
}

interface PlataformaResumen {
  plataforma: string;
  costo: number;
  ingresos: number;
  ganancia: number;
  cuentas: number;
}

const resumen = ref<Resumen | null>(null);
const porPlataforma = ref<PlataformaResumen[]>([]);
const loading = ref(true);

function fmt(n: string | number) {
  return `$${parseFloat(String(n)).toFixed(2)}`;
}

onMounted(async () => {
  try {
    const [r, p] = await Promise.all([
      api.get('/finanzas/resumen'),
      api.get('/finanzas/por-plataforma'),
    ]);
    resumen.value = r.data;
    porPlataforma.value = p.data;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Dashboard Financiero</h1>

    <div v-if="loading" class="text-themed-muted">Cargando...</div>

    <template v-else-if="resumen">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <KpiCard title="Total pagado a dueños" :value="fmt(resumen.costo_total_pagado)" color="text-cost" />
        <KpiCard title="Total cobrado a clientes" :value="fmt(resumen.total_ingresos_clientes)" color="text-income" />
        <KpiCard
          title="Margen neto de ganancia"
          :value="fmt(resumen.ganancia_neta_total)"
          :color="parseFloat(resumen.ganancia_neta_total) >= 0 ? 'text-money' : 'text-cost'"
        />
      </div>

      <h2 class="text-lg font-semibold mb-4">Desglose por plataforma</h2>
      <div class="hidden md:block table-wrap card card-flush">
        <table class="data-table">
          <thead>
            <tr>
              <th>Plataforma</th>
              <th>Cuentas</th>
              <th>Costo dueños</th>
              <th>Ingresos</th>
              <th>Ganancia neta</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in porPlataforma" :key="p.plataforma">
              <td class="font-medium">{{ p.plataforma }}</td>
              <td>{{ p.cuentas }}</td>
              <td class="text-cost">${{ p.costo.toFixed(2) }}</td>
              <td class="text-income">${{ p.ingresos.toFixed(2) }}</td>
              <td :class="p.ganancia >= 0 ? 'text-money' : 'text-cost'">${{ p.ganancia.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="md:hidden space-y-3">
        <div v-for="p in porPlataforma" :key="p.plataforma" class="card">
          <h3 class="font-semibold text-brand">{{ p.plataforma }}</h3>
          <div class="grid grid-cols-2 gap-2 mt-2 text-sm">
            <div><span class="text-themed-muted">Cuentas:</span> {{ p.cuentas }}</div>
            <div><span class="text-themed-muted">Costo:</span> <span class="text-cost">${{ p.costo.toFixed(2) }}</span></div>
            <div><span class="text-themed-muted">Ingresos:</span> <span class="text-income">${{ p.ingresos.toFixed(2) }}</span></div>
            <div><span class="text-themed-muted">Ganancia:</span> <span :class="p.ganancia >= 0 ? 'text-money' : 'text-cost'">${{ p.ganancia.toFixed(2) }}</span></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
