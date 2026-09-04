<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import api from '@/services/api';
import EstadoBadge from '@/components/EstadoBadge.vue';
import FormField from '@/components/FormField.vue';
import InputMoney from '@/components/InputMoney.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';

interface Suscripcion {
  suscripcion_id: number;
  cuenta_id: number;
  cliente_id: number;
  cliente_nombre: string;
  plataforma: string;
  cuenta_identificador: string;
  dueno_cuenta: string;
  perfil_nombre: string;
  precio_cobro: string;
  fecha_corte: string;
  aplica_gracia: boolean;
  dias_gracia: number;
  estado_codigo: string;
  estado_nombre: string;
  color_hex: string;
  activo: boolean;
}

interface Cuenta {
  id: number;
  identificador: string;
  duenoNombre: string;
  cuposTotales: number;
  plataforma: { nombre: string };
  suscripciones: unknown[];
}

interface Cliente {
  id: number;
  nombre: string;
  aplicaDiasGracia: boolean;
  diasGraciaDefault: number;
}

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();
const items = ref<Suscripcion[]>([]);
const cuentas = ref<Cuenta[]>([]);
const clientes = ref<Cliente[]>([]);
const loading = ref(true);
const showForm = ref(false);
const saving = ref(false);
const editing = ref<Suscripcion | null>(null);

const filterPlataforma = ref('');
const filterEstado = ref('');
const filterDueno = ref('');

const form = ref({
  cuentaId: 0,
  clienteId: 0,
  perfilNombre: '',
  precioCobro: 0,
  fechaCorte: '',
  aplicaGracia: false,
  diasGracia: 0,
  activo: true,
});

const filtered = computed(() =>
  items.value.filter((s) => {
    if (filterPlataforma.value && !s.plataforma.toLowerCase().includes(filterPlataforma.value.toLowerCase())) return false;
    if (filterEstado.value && s.estado_codigo !== filterEstado.value) return false;
    if (filterDueno.value && !s.dueno_cuenta.toLowerCase().includes(filterDueno.value.toLowerCase())) return false;
    return true;
  }),
);

function cuentaLabel(c: Cuenta) {
  return `${c.plataforma.nombre} · ${c.identificador} (${c.duenoNombre})`;
}

function emptyForm() {
  return {
    cuentaId: cuentas.value[0]?.id ?? 0,
    clienteId: clientes.value[0]?.id ?? 0,
    perfilNombre: '',
    precioCobro: 3,
    fechaCorte: new Date().toISOString().split('T')[0],
    aplicaGracia: false,
    diasGracia: 0,
    activo: true,
  };
}

async function load() {
  loading.value = true;
  try {
    const [s, c, cl] = await Promise.all([
      api.get('/suscripciones'),
      api.get('/cuentas'),
      api.get('/clientes'),
    ]);
    items.value = s.data;
    cuentas.value = c.data;
    clientes.value = cl.data;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.value = emptyForm();
  showForm.value = true;
}

function openEdit(s: Suscripcion) {
  editing.value = s;
  form.value = {
    cuentaId: s.cuenta_id,
    clienteId: s.cliente_id,
    perfilNombre: s.perfil_nombre ?? '',
    precioCobro: parseFloat(s.precio_cobro),
    fechaCorte: s.fecha_corte?.split('T')[0] ?? '',
    aplicaGracia: s.aplica_gracia,
    diasGracia: s.dias_gracia,
    activo: s.activo,
  };
  showForm.value = true;
}

async function save() {
  saving.value = true;
  const isEdit = !!editing.value;
  try {
    const payload = { ...form.value };
    if (editing.value) {
      await api.patch(`/suscripciones/${editing.value.suscripcion_id}`, payload);
    } else {
      await api.post('/suscripciones', payload);
    }
    showForm.value = false;
    await load();
    toast.success(isEdit ? 'Suscripción actualizada' : 'Suscripción creada');
  } catch {
    toast.error('Error', 'No se pudo guardar la suscripción');
  } finally {
    saving.value = false;
  }
}

async function remove(s: Suscripcion) {
  const ok = await confirm({
    title: 'Eliminar suscripción',
    message: `¿Eliminar la suscripción de ${s.cliente_nombre} en ${s.plataforma}?`,
    confirmText: 'Eliminar',
    variant: 'danger',
  });
  if (!ok) return;
  try {
    await api.delete(`/suscripciones/${s.suscripcion_id}`);
    await load();
    toast.success('Eliminada', 'Suscripción eliminada correctamente');
  } catch {
    toast.error('Error', 'No se pudo eliminar');
  }
}

watch(
  () => form.value.clienteId,
  (id) => {
    const cl = clientes.value.find((c) => c.id === id);
    if (!cl || editing.value) return;
    if (!form.value.perfilNombre) form.value.perfilNombre = cl.nombre;
    if (cl.aplicaDiasGracia) {
      form.value.aplicaGracia = true;
      form.value.diasGracia = cl.diasGraciaDefault;
    }
  },
);

onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Suscripciones</h1>
        <p class="text-sm text-themed-muted mt-1">
          Asigna un cliente a un cupo/perfil dentro de una cuenta de plataforma.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <input v-model="filterPlataforma" placeholder="Plataforma" class="input w-auto min-w-[120px]" />
        <select v-model="filterEstado" class="input w-auto">
          <option value="">Todos los estados</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="VENCE_HOY">Vence hoy</option>
          <option value="EN_GRACIA">En gracia</option>
          <option value="VENCIDA">Vencida</option>
        </select>
        <input v-model="filterDueno" placeholder="Dueño" class="input w-auto min-w-[120px]" />
        <button
          v-if="auth.hasPermission('suscripciones.crear')"
          class="btn-primary shrink-0"
          @click="openCreate"
        >
          + Nueva suscripción
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-themed-muted">Cargando...</div>

    <div v-else class="hidden lg:block table-wrap card card-flush">
      <table class="data-table">
        <thead>
          <tr>
            <th class="sticky-col">Cliente</th>
            <th>Plataforma</th>
            <th>Cuenta</th>
            <th>Dueño</th>
            <th>Perfil</th>
            <th>Precio cobro</th>
            <th>Corte</th>
            <th>Estado</th>
            <th v-if="auth.hasPermission('suscripciones.editar')">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filtered" :key="s.suscripcion_id">
            <td class="sticky-col">{{ s.cliente_nombre }}</td>
            <td>{{ s.plataforma }}</td>
            <td class="text-themed-muted">{{ s.cuenta_identificador }}</td>
            <td>{{ s.dueno_cuenta }}</td>
            <td>{{ s.perfil_nombre }}</td>
            <td class="text-money">${{ parseFloat(s.precio_cobro).toFixed(2) }}</td>
            <td>{{ s.fecha_corte?.split('T')[0] }}</td>
            <td>
              <EstadoBadge :label="s.estado_codigo" :codigo="s.estado_codigo" :nombre="s.estado_nombre" :color-hex="s.color_hex" />
            </td>
            <td v-if="auth.hasPermission('suscripciones.editar')" class="whitespace-nowrap">
              <button class="text-link text-sm font-medium mr-3" @click="openEdit(s)">Editar</button>
              <button
                v-if="auth.hasPermission('suscripciones.eliminar')"
                class="text-danger text-sm"
                @click="remove(s)"
              >
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="lg:hidden space-y-3">
      <div v-for="s in filtered" :key="s.suscripcion_id" class="card">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-semibold">{{ s.cliente_nombre }}</h3>
            <p class="text-sm text-themed-muted">{{ s.plataforma }} · {{ s.cuenta_identificador }}</p>
          </div>
          <EstadoBadge :label="s.estado_codigo" :codigo="s.estado_codigo" :nombre="s.estado_nombre" :color-hex="s.color_hex" />
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div><span class="text-subtle">Dueño:</span> {{ s.dueno_cuenta }}</div>
          <div><span class="text-subtle">Cobro:</span> <span class="text-money">${{ parseFloat(s.precio_cobro).toFixed(2) }}</span></div>
          <div class="col-span-2"><span class="text-subtle">Corte:</span> {{ s.fecha_corte?.split('T')[0] }}</div>
        </div>
        <div v-if="auth.hasPermission('suscripciones.editar')" class="flex gap-3 mt-3">
          <button class="text-link text-sm font-medium" @click="openEdit(s)">Editar</button>
          <button v-if="auth.hasPermission('suscripciones.eliminar')" class="text-danger text-sm" @click="remove(s)">Eliminar</button>
        </div>
      </div>
    </div>

    <p v-if="!loading && filtered.length === 0" class="text-themed-muted mt-4">No hay suscripciones.</p>

    <div
      v-if="showForm"
      class="fixed inset-0 modal-overlay z-50 flex items-end sm:items-center justify-center p-4"
      @click.self="showForm = false"
    >
      <div class="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold mb-1">{{ editing ? 'Editar suscripción' : 'Nueva suscripción' }}</h2>
        <p class="text-xs text-themed-muted mb-5">
          Vincula un cliente a un cupo de una cuenta. El precio de cobro es lo que el cliente te paga a ti.
        </p>

        <form class="space-y-4" @submit.prevent="save">
          <FormField
            label="Cuenta de plataforma"
            hint="La cuenta familiar/completa donde irá el perfil del cliente."
            required
          >
            <select v-model.number="form.cuentaId" class="input" required>
              <option v-for="c in cuentas" :key="c.id" :value="c.id">{{ cuentaLabel(c) }}</option>
            </select>
          </FormField>

          <FormField
            label="Cliente"
            hint="Persona que contrata el servicio contigo."
            required
          >
            <select v-model.number="form.clienteId" class="input" required>
              <option v-for="cl in clientes" :key="cl.id" :value="cl.id">{{ cl.nombre }}</option>
            </select>
          </FormField>

          <FormField
            label="Nombre del perfil"
            hint="Nombre del perfil dentro de la plataforma. Ej: Melissa, Roberto."
          >
            <input v-model="form.perfilNombre" class="input" placeholder="Ej: Melissa" />
          </FormField>

          <FormField
            label="Precio de cobro (USD)"
            hint="Cuánto le cobras al cliente por mes. Esto suma a tus ingresos en el dashboard."
            required
          >
            <InputMoney v-model="form.precioCobro" step="0.01" min="0" required />
          </FormField>

          <FormField
            label="Fecha de corte"
            hint="Día del mes en que vence el pago del cliente."
            required
          >
            <input v-model="form.fechaCorte" class="input" type="date" required />
          </FormField>

          <FormField
            label="Días de gracia"
            hint="Días extra después del corte antes de marcar como vencida."
          >
            <label class="flex items-center gap-2 text-sm cursor-pointer mb-2">
              <input v-model="form.aplicaGracia" type="checkbox" class="rounded" />
              Aplicar días de gracia a esta suscripción
            </label>
            <input v-model.number="form.diasGracia" class="input" type="number" min="0" placeholder="Ej: 3" />
          </FormField>

          <FormField v-if="editing" label="Estado de la suscripción" hint="Desactiva si el cliente ya no usa el servicio.">
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="form.activo" type="checkbox" class="rounded" />
              Suscripción activa
            </label>
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
