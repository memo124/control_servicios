<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import FormField from '@/components/FormField.vue';

interface Cliente {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  deseaNotificacionesCorreo: boolean;
  aplicaDiasGracia: boolean;
  diasGraciaDefault: number;
  activo: boolean;
}

const auth = useAuthStore();
const items = ref<Cliente[]>([]);
const loading = ref(true);
const showForm = ref(false);
const editing = ref<Cliente | null>(null);
const form = ref({
  nombre: '', email: '', telefono: '',
  deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0,
});

async function load() {
  loading.value = true;
  const { data } = await api.get('/clientes');
  items.value = data;
  loading.value = false;
}

function openCreate() {
  editing.value = null;
  form.value = { nombre: '', email: '', telefono: '', deseaNotificacionesCorreo: true, aplicaDiasGracia: false, diasGraciaDefault: 0 };
  showForm.value = true;
}

function openEdit(c: Cliente) {
  editing.value = c;
  form.value = {
    nombre: c.nombre,
    email: c.email ?? '',
    telefono: c.telefono ?? '',
    deseaNotificacionesCorreo: c.deseaNotificacionesCorreo,
    aplicaDiasGracia: c.aplicaDiasGracia,
    diasGraciaDefault: c.diasGraciaDefault,
  };
  showForm.value = true;
}

async function save() {
  if (editing.value) {
    await api.patch(`/clientes/${editing.value.id}`, form.value);
  } else {
    await api.post('/clientes', form.value);
  }
  showForm.value = false;
  await load();
}

async function toggleNotif(c: Cliente) {
  await api.patch(`/clientes/${c.id}`, { deseaNotificacionesCorreo: !c.deseaNotificacionesCorreo });
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Clientes</h1>
      <button v-if="auth.hasPermission('clientes.gestionar')" class="btn-primary" @click="openCreate">+ Nuevo</button>
    </div>

    <div v-if="loading" class="text-themed-muted">Cargando...</div>

    <div v-else class="hidden md:block table-wrap card card-flush">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Notificaciones</th>
            <th>Gracia</th>
            <th>Días gracia</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in items" :key="c.id">
            <td class="font-medium">{{ c.nombre }}</td>
            <td>{{ c.email ?? '—' }}</td>
            <td>
              <button
                v-if="auth.hasPermission('clientes.gestionar')"
                :class="['w-10 h-5 rounded-full transition-colors relative', c.deseaNotificacionesCorreo ? 'bg-indigo-600' : 'toggle-track-off']"
                @click="toggleNotif(c)"
              >
                <span :class="['absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', c.deseaNotificacionesCorreo ? 'left-5' : 'left-0.5']" />
              </button>
              <span v-else>{{ c.deseaNotificacionesCorreo ? 'Sí' : 'No' }}</span>
            </td>
            <td>{{ c.aplicaDiasGracia ? 'Sí' : 'No' }}</td>
            <td>{{ c.diasGraciaDefault }}</td>
            <td>
              <button v-if="auth.hasPermission('clientes.gestionar')" class="text-link text-sm" @click="openEdit(c)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="md:hidden space-y-3">
      <div v-for="c in items" :key="c.id" class="card">
        <div class="flex justify-between">
          <div>
            <h3 class="font-semibold">{{ c.nombre }}</h3>
            <p class="text-sm text-themed-muted">{{ c.email ?? 'Sin email' }}</p>
          </div>
          <button v-if="auth.hasPermission('clientes.gestionar')" class="text-link text-sm" @click="openEdit(c)">Editar</button>
        </div>
        <div class="flex gap-4 mt-2 text-sm">
          <span>Correos: {{ c.deseaNotificacionesCorreo ? 'On' : 'Off' }}</span>
          <span>Gracia: {{ c.diasGraciaDefault }}d</span>
        </div>
      </div>
    </div>

    <div v-if="showForm" class="fixed inset-0 modal-overlay z-50 flex items-end sm:items-center justify-center p-4" @click.self="showForm = false">
      <div class="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold mb-4">{{ editing ? 'Editar' : 'Nuevo' }} cliente</h2>
        <form class="space-y-4" @submit.prevent="save">
          <FormField label="Nombre del cliente" hint="Nombre completo o apodo con el que identificas al cliente." required>
            <input v-model="form.nombre" class="input" placeholder="Ej: Melissa" required />
          </FormField>
          <FormField label="Correo electrónico" hint="Se usa para enviar avisos de cobro. Debe ser válido si activas notificaciones.">
            <input v-model="form.email" class="input" type="email" placeholder="cliente@email.com" />
          </FormField>
          <FormField label="Teléfono" hint="Opcional. Para contacto directo.">
            <input v-model="form.telefono" class="input" placeholder="+503 0000-0000" />
          </FormField>
          <FormField label="Notificaciones por correo" hint="Si está activo, recibirá avisos cuando su suscripción venza o entre en gracia.">
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="form.deseaNotificacionesCorreo" type="checkbox" class="rounded" />
              Enviar recordatorios de pago por email
            </label>
          </FormField>
          <FormField label="Días de gracia" hint="Margen extra después del corte antes de considerar la suscripción vencida.">
            <label class="flex items-center gap-2 text-sm cursor-pointer mb-2">
              <input v-model="form.aplicaDiasGracia" type="checkbox" class="rounded" />
              Este cliente puede usar días de gracia
            </label>
            <input v-model.number="form.diasGraciaDefault" class="input" type="number" min="0" placeholder="Ej: 3" />
          </FormField>
          <div class="flex gap-2 pt-2">
            <button type="submit" class="btn-primary flex-1">Guardar</button>
            <button type="button" class="btn-secondary flex-1" @click="showForm = false">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
