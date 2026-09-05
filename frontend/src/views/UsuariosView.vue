<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

interface User {
  id: number;
  name: string;
  email: string;
  telefono: string | null;
  status: string;
  roles: { role: { nombre: string; slug: string } }[];
}

interface Role {
  id: number;
  nombre: string;
  slug: string;
  permissions: { permission: { slug: string; nombre: string } }[];
}

const auth = useAuthStore();
const toast = useToast();
const users = ref<User[]>([]);
const roles = ref<Role[]>([]);
const showForm = ref(false);
const editing = ref<User | null>(null);
const form = ref({
  name: '',
  email: '',
  telefono: '',
  password: '',
  roleSlug: 'operador',
  status: 'active',
});

function statusLabel(status: string) {
  return status === 'active' ? 'Activo' : 'Inactivo';
}

async function load() {
  const [u, r] = await Promise.all([api.get('/users'), api.get('/users/roles')]);
  users.value = u.data;
  roles.value = r.data;
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', email: '', telefono: '', password: '', roleSlug: 'operador', status: 'active' };
  showForm.value = true;
}

function openEdit(u: User) {
  editing.value = u;
  form.value = {
    name: u.name,
    email: u.email,
    telefono: u.telefono ?? '',
    password: '',
    roleSlug: u.roles[0]?.role.slug ?? 'operador',
    status: u.status,
  };
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editing.value = null;
}

async function save() {
  try {
    if (editing.value) {
      const payload: Record<string, string> = {
        name: form.value.name,
        email: form.value.email,
        telefono: form.value.telefono,
        roleSlug: form.value.roleSlug,
        status: form.value.status,
      };
      if (form.value.password) payload.password = form.value.password;
      await api.patch(`/users/${editing.value.id}`, payload);
      toast.success('Usuario actualizado', 'Los cambios se guardaron correctamente');
    } else {
      await api.post('/users', {
        name: form.value.name,
        email: form.value.email,
        telefono: form.value.telefono || undefined,
        password: form.value.password,
        roleSlug: form.value.roleSlug,
      });
      toast.success('Usuario creado', 'El nuevo usuario ya puede iniciar sesión');
    }
    closeForm();
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
    const detail = Array.isArray(msg) ? msg[0] : msg;
    toast.error('Error al guardar', detail ?? 'Revisa los datos e intenta de nuevo');
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Usuarios y Roles</h1>
      <button class="btn-primary" @click="openCreate">+ Nuevo usuario</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 table-wrap card card-flush">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.telefono ?? '—' }}</td>
              <td>{{ u.roles.map(r => r.role.nombre).join(', ') }}</td>
              <td>
                <span :class="u.status === 'active' ? 'text-success' : 'text-cost'">
                  {{ statusLabel(u.status) }}
                </span>
              </td>
              <td>
                <button class="text-link text-sm" @click="openEdit(u)">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="space-y-3">
        <h2 class="font-semibold">Roles del sistema</h2>
        <div v-for="r in roles" :key="r.id" class="card">
          <h3 class="font-medium text-brand">{{ r.nombre }}</h3>
          <p class="text-xs text-themed-muted mt-1">{{ r.permissions.map(p => p.permission.slug).join(', ') }}</p>
        </div>
      </div>
    </div>

    <div v-if="showForm" class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" @click.self="closeForm">
      <div class="card w-full max-w-md">
        <h2 class="text-lg font-semibold mb-4">{{ editing ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
        <form class="space-y-3" @submit.prevent="save">
          <input v-model="form.name" class="input" placeholder="Nombre" required />
          <input v-model="form.email" class="input" type="email" placeholder="Email" required />
          <input v-model="form.telefono" class="input" type="tel" placeholder="Teléfono (opcional)" />
          <p class="text-xs text-themed-muted -mt-1">
            Referencia de contacto del operador/dueño (no es Chat ID de Telegram).
          </p>
          <input
            v-model="form.password"
            class="input"
            type="password"
            :placeholder="editing ? 'Nueva contraseña (opcional)' : 'Contraseña'"
            :required="!editing"
            minlength="8"
          />
          <select v-model="form.roleSlug" class="input">
            <option v-for="r in roles" :key="r.slug" :value="r.slug">{{ r.nombre }}</option>
          </select>
          <select v-if="editing" v-model="form.status" class="input" :disabled="editing.id === auth.user?.id">
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          <p v-if="editing?.id === auth.user?.id" class="text-xs text-themed-muted">
            No puedes desactivar tu propia cuenta mientras estás conectado.
          </p>
          <div class="flex gap-2">
            <button type="submit" class="btn-primary flex-1">{{ editing ? 'Guardar' : 'Crear' }}</button>
            <button type="button" class="btn-secondary flex-1" @click="closeForm">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
