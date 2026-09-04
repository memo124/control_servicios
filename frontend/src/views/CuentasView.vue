<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';

interface Cuenta {
  id: number;
  identificador: string;
  duenoNombre: string;
  costoMensual: string;
  cuposTotales: number;
  activo: boolean;
  plataforma: { id: number; nombre: string };
  suscripciones: unknown[];
}

interface Plataforma { id: number; nombre: string }

const auth = useAuthStore();
const items = ref<Cuenta[]>([]);
const plataformas = ref<Plataforma[]>([]);
const loading = ref(true);
const showForm = ref(false);
const form = ref({ plataformaId: 0, identificador: '', duenoNombre: '', costoMensual: 0, cuposTotales: 1 });

async function load() {
  loading.value = true;
  const [c, p] = await Promise.all([api.get('/cuentas'), api.get('/plataformas')]);
  items.value = c.data;
  plataformas.value = p.data;
  if (plataformas.value.length) form.value.plataformaId = plataformas.value[0].id;
  loading.value = false;
}

async function save() {
  await api.post('/cuentas', form.value);
  showForm.value = false;
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Cuentas y Dueños</h1>
      <button v-if="auth.hasPermission('cuentas.gestionar')" class="btn-primary" @click="showForm = true">+ Nueva cuenta</button>
    </div>

    <div v-if="loading" class="text-slate-400">Cargando...</div>

    <div v-else class="hidden md:block overflow-x-auto card !p-0">
      <table class="w-full text-sm">
        <thead class="bg-slate-800/50">
          <tr class="text-left text-slate-400">
            <th class="py-3 px-4 sticky left-0 bg-slate-800/90">Plataforma</th>
            <th class="py-3 px-4">Identificador</th>
            <th class="py-3 px-4">Dueño</th>
            <th class="py-3 px-4">Costo mensual</th>
            <th class="py-3 px-4">Cupos</th>
            <th class="py-3 px-4">Ocupados</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in items" :key="c.id" class="border-t border-slate-800/50">
            <td class="py-3 px-4 sticky left-0 bg-slate-900/95">{{ c.plataforma.nombre }}</td>
            <td class="py-3 px-4">{{ c.identificador }}</td>
            <td class="py-3 px-4 font-medium text-indigo-300">{{ c.duenoNombre }}</td>
            <td class="py-3 px-4 text-red-400">${{ parseFloat(c.costoMensual).toFixed(2) }}</td>
            <td class="py-3 px-4">{{ c.cuposTotales }}</td>
            <td class="py-3 px-4">{{ c.suscripciones?.length ?? 0 }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="md:hidden space-y-3">
      <div v-for="c in items" :key="c.id" class="card">
        <div class="flex justify-between">
          <h3 class="font-semibold">{{ c.plataforma.nombre }}</h3>
          <span class="text-red-400 font-bold">${{ parseFloat(c.costoMensual).toFixed(2) }}/mes</span>
        </div>
        <p class="text-sm text-slate-400">{{ c.identificador }}</p>
        <p class="text-sm mt-1">Dueño: <span class="text-indigo-300">{{ c.duenoNombre }}</span></p>
        <p class="text-xs text-slate-500 mt-1">{{ c.suscripciones?.length ?? 0 }}/{{ c.cuposTotales }} cupos</p>
      </div>
    </div>

    <div v-if="showForm" class="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" @click.self="showForm = false">
      <div class="card w-full max-w-md">
        <h2 class="text-lg font-semibold mb-4">Nueva cuenta</h2>
        <form class="space-y-3" @submit.prevent="save">
          <select v-model.number="form.plataformaId" class="input" required>
            <option v-for="p in plataformas" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>
          <input v-model="form.identificador" class="input" placeholder="Identificador (ej. Familia #1)" required />
          <input v-model="form.duenoNombre" class="input" placeholder="Dueño / titular" required />
          <input v-model.number="form.costoMensual" class="input" type="number" step="0.01" min="0" placeholder="Costo mensual" required />
          <input v-model.number="form.cuposTotales" class="input" type="number" min="1" placeholder="Cupos totales" />
          <div class="flex gap-2 pt-2">
            <button type="submit" class="btn-primary flex-1">Guardar</button>
            <button type="button" class="btn-secondary flex-1" @click="showForm = false">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
