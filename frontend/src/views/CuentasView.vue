<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useFormDraft } from '@/composables/useFormDraft';
import { useToast } from '@/composables/useToast';
import FormField from '@/components/FormField.vue';
import InputMoney from '@/components/InputMoney.vue';

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
const toast = useToast();
const items = ref<Cuenta[]>([]);
const plataformas = ref<Plataforma[]>([]);
const loading = ref(true);
const showForm = ref(false);
const saving = ref(false);
const editing = ref<Cuenta | null>(null);
const form = ref({
  plataformaId: 0,
  identificador: '',
  duenoNombre: '',
  costoMensual: 0,
  cuposTotales: 1,
});
const { clear: clearDraft, restore: restoreDraft } = useFormDraft('cuentas-form', form, {
  enabled: () => showForm.value && !editing.value,
});

function emptyForm() {
  return {
    plataformaId: plataformas.value[0]?.id ?? 0,
    identificador: '',
    duenoNombre: '',
    costoMensual: 0,
    cuposTotales: 1,
  };
}

async function load() {
  loading.value = true;
  const [c, p] = await Promise.all([api.get('/cuentas'), api.get('/plataformas')]);
  items.value = c.data;
  plataformas.value = p.data;
  loading.value = false;
}

function openCreate() {
  editing.value = null;
  form.value = emptyForm();
  showForm.value = true;
  if (restoreDraft()) toast.info('Borrador restaurado', 'Se recuperaron los datos del formulario anterior.');
}

function openEdit(c: Cuenta) {
  editing.value = c;
  form.value = {
    plataformaId: c.plataforma.id,
    identificador: c.identificador,
    duenoNombre: c.duenoNombre,
    costoMensual: parseFloat(c.costoMensual),
    cuposTotales: c.cuposTotales,
  };
  showForm.value = true;
}

async function save() {
  saving.value = true;
  try {
    if (editing.value) {
      await api.patch(`/cuentas/${editing.value.id}`, form.value);
    } else {
      await api.post('/cuentas', form.value);
    }
    clearDraft();
    showForm.value = false;
    await load();
  } catch {
    toast.error('Error al guardar', 'Revisa tu conexión. El borrador se conserva para reintentar.');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Cuentas y Dueños</h1>
        <p class="text-sm text-themed-muted mt-1">
          Cada cuenta representa lo que pagas al titular (dueño) por una suscripción familiar o completa.
        </p>
      </div>
      <button v-if="auth.hasPermission('cuentas.gestionar')" class="btn-primary shrink-0" @click="openCreate">
        + Nueva cuenta
      </button>
    </div>

    <div v-if="loading" class="text-themed-muted">Cargando...</div>

    <div v-else class="hidden md:block table-wrap card card-flush">
      <table class="data-table">
        <thead>
          <tr>
            <th class="sticky-col">Plataforma</th>
            <th>Identificador</th>
            <th>Dueño (a quien pagas)</th>
            <th>Costo mensual</th>
            <th>Cupos</th>
            <th>Ocupados</th>
            <th v-if="auth.hasPermission('cuentas.gestionar')">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in items" :key="c.id">
            <td class="sticky-col">{{ c.plataforma.nombre }}</td>
            <td>{{ c.identificador }}</td>
            <td class="text-brand">{{ c.duenoNombre }}</td>
            <td class="text-cost">${{ parseFloat(c.costoMensual).toFixed(2) }}</td>
            <td>{{ c.cuposTotales }}</td>
            <td>{{ c.suscripciones?.length ?? 0 }}</td>
            <td v-if="auth.hasPermission('cuentas.gestionar')">
              <button class="text-link text-sm font-medium" @click="openEdit(c)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="md:hidden space-y-3">
      <div v-for="c in items" :key="c.id" class="card">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-semibold">{{ c.plataforma.nombre }}</h3>
            <p class="text-sm text-themed-muted">{{ c.identificador }}</p>
          </div>
          <span class="text-cost">${{ parseFloat(c.costoMensual).toFixed(2) }}/mes</span>
        </div>
        <p class="text-sm mt-2">
          Dueño: <span class="text-brand">{{ c.duenoNombre }}</span>
        </p>
        <p class="text-xs text-themed-muted mt-1">{{ c.suscripciones?.length ?? 0 }}/{{ c.cuposTotales }} cupos ocupados</p>
        <button
          v-if="auth.hasPermission('cuentas.gestionar')"
          class="mt-3 text-link text-sm font-medium"
          @click="openEdit(c)"
        >
          Editar cuenta
        </button>
      </div>
    </div>

    <div
      v-if="showForm"
      class="fixed inset-0 modal-overlay z-50 flex items-end sm:items-center justify-center p-4"
      @click.self="showForm = false"
    >
      <div class="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold mb-1">{{ editing ? 'Editar cuenta' : 'Nueva cuenta' }}</h2>
        <p class="text-xs text-themed-muted mb-5">
          Registra cuánto pagas al dueño por mantener esta cuenta activa en la plataforma.
        </p>

        <form class="space-y-4" @submit.prevent="save">
          <FormField
            label="Plataforma de streaming"
            hint="Servicio al que pertenece esta cuenta (Spotify, HBO Max, etc.)."
            required
          >
            <select v-model.number="form.plataformaId" class="input" required>
              <option v-for="p in plataformas" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </FormField>

          <FormField
            label="Identificador de la cuenta"
            hint="Nombre interno para distinguirla. Ej: Familia #1, Cuenta 2, HBO 1."
            required
          >
            <input v-model="form.identificador" class="input" placeholder="Ej: Familia #1" required />
          </FormField>

          <FormField
            label="Dueño / titular"
            hint="Persona a quien le pagas la cuenta completa. Ej: Guillermo, Oscar, Enzo."
            required
          >
            <input v-model="form.duenoNombre" class="input" placeholder="Ej: Guillermo" required />
          </FormField>

          <FormField
            label="Costo mensual (USD)"
            hint="Lo que TÚ pagas al dueño por esta cuenta cada mes. Este monto se resta de lo que cobras a clientes para calcular la ganancia."
            required
          >
            <InputMoney v-model="form.costoMensual" placeholder="12.00" step="0.01" min="0" required />
          </FormField>

          <FormField
            label="Cupos totales"
            hint="Cantidad máxima de perfiles o clientes que puedes vender en esta cuenta."
          >
            <input
              v-model.number="form.cuposTotales"
              class="input"
              type="number"
              min="1"
              placeholder="6"
            />
          </FormField>

          <div class="flex gap-2 pt-2">
            <button type="submit" class="btn-primary flex-1" :disabled="saving">
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
            <button type="button" class="btn-secondary flex-1" @click="showForm = false">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
