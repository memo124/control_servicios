<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import api from '@/services/api';
import EstadoBadge from '@/components/EstadoBadge.vue';

interface Suscripcion {
  suscripcion_id: number;
  cliente_nombre: string;
  plataforma: string;
  dueno_cuenta: string;
  perfil_nombre: string;
  precio_cobro: string;
  fecha_corte: string;
  estado_codigo: string;
  estado_nombre: string;
  color_hex: string;
  activo: boolean;
}

const items = ref<Suscripcion[]>([]);
const loading = ref(true);
const filterPlataforma = ref('');
const filterEstado = ref('');
const filterDueno = ref('');

const filtered = computed(() =>
  items.value.filter((s) => {
    if (filterPlataforma.value && !s.plataforma.toLowerCase().includes(filterPlataforma.value.toLowerCase())) return false;
    if (filterEstado.value && s.estado_codigo !== filterEstado.value) return false;
    if (filterDueno.value && !s.dueno_cuenta.toLowerCase().includes(filterDueno.value.toLowerCase())) return false;
    return true;
  }),
);

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/suscripciones');
    items.value = data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <h1 class="text-2xl font-bold">Suscripciones</h1>
      <div class="flex flex-wrap gap-2">
        <input v-model="filterPlataforma" placeholder="Plataforma" class="input w-auto min-w-[120px]" />
        <select v-model="filterEstado" class="input w-auto">
          <option value="">Todos los estados</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="VENCE_HOY">Vence hoy</option>
          <option value="EN_GRACIA">En gracia</option>
          <option value="VENCIDA">Vencida</option>
        </select>
        <input v-model="filterDueno" placeholder="Dueño" class="input w-auto min-w-[120px]" />
      </div>
    </div>

    <div v-if="loading" class="text-slate-400">Cargando...</div>

    <!-- Desktop table -->
    <div v-else class="hidden lg:block overflow-x-auto card !p-0">
      <table class="w-full text-sm">
        <thead class="bg-slate-800/50">
          <tr class="text-left text-slate-400">
            <th class="py-3 px-4 sticky left-0 bg-slate-800/90">Cliente</th>
            <th class="py-3 px-4">Plataforma</th>
            <th class="py-3 px-4">Dueño</th>
            <th class="py-3 px-4">Perfil</th>
            <th class="py-3 px-4">Precio</th>
            <th class="py-3 px-4">Corte</th>
            <th class="py-3 px-4">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filtered" :key="s.suscripcion_id" class="border-t border-slate-800/50 hover:bg-slate-800/30">
            <td class="py-3 px-4 sticky left-0 bg-slate-900/95 font-medium">{{ s.cliente_nombre }}</td>
            <td class="py-3 px-4">{{ s.plataforma }}</td>
            <td class="py-3 px-4">{{ s.dueno_cuenta }}</td>
            <td class="py-3 px-4">{{ s.perfil_nombre }}</td>
            <td class="py-3 px-4">${{ parseFloat(s.precio_cobro).toFixed(2) }}</td>
            <td class="py-3 px-4">{{ s.fecha_corte?.split('T')[0] }}</td>
            <td class="py-3 px-4">
              <EstadoBadge :label="s.estado_codigo" :codigo="s.estado_codigo" :nombre="s.estado_nombre" :color-hex="s.color_hex" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile cards -->
    <div class="lg:hidden space-y-3">
      <div v-for="s in filtered" :key="s.suscripcion_id" class="card">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-semibold">{{ s.cliente_nombre }}</h3>
            <p class="text-sm text-slate-400">{{ s.plataforma }} · {{ s.perfil_nombre }}</p>
          </div>
          <EstadoBadge :label="s.estado_codigo" :codigo="s.estado_codigo" :nombre="s.estado_nombre" :color-hex="s.color_hex" />
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div><span class="text-slate-500">Dueño:</span> {{ s.dueno_cuenta }}</div>
          <div><span class="text-slate-500">Precio:</span> ${{ parseFloat(s.precio_cobro).toFixed(2) }}</div>
          <div class="col-span-2"><span class="text-slate-500">Corte:</span> {{ s.fecha_corte?.split('T')[0] }}</div>
        </div>
      </div>
    </div>

    <p v-if="!loading && filtered.length === 0" class="text-slate-500 mt-4">No hay suscripciones.</p>
  </div>
</template>
