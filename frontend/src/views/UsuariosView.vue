<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/services/api';

interface User {
  id: number;
  name: string;
  email: string;
  status: string;
  roles: { role: { nombre: string; slug: string } }[];
}

interface Role {
  id: number;
  nombre: string;
  slug: string;
  permissions: { permission: { slug: string; nombre: string } }[];
}

const users = ref<User[]>([]);
const roles = ref<Role[]>([]);
const showForm = ref(false);
const form = ref({ name: '', email: '', password: '', roleSlug: 'operador' });

async function load() {
  const [u, r] = await Promise.all([api.get('/users'), api.get('/users/roles')]);
  users.value = u.data;
  roles.value = r.data;
}

async function create() {
  await api.post('/users', form.value);
  showForm.value = false;
  form.value = { name: '', email: '', password: '', roleSlug: 'operador' };
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Usuarios y Roles</h1>
      <button class="btn-primary" @click="showForm = true">+ Nuevo usuario</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 table-wrap card card-flush">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.roles.map(r => r.role.nombre).join(', ') }}</td>
              <td>
                <span :class="u.status === 'active' ? 'text-success' : 'text-cost'">{{ u.status }}</span>
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

    <div v-if="showForm" class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" @click.self="showForm = false">
      <div class="card w-full max-w-md">
        <h2 class="text-lg font-semibold mb-4">Nuevo usuario</h2>
        <form class="space-y-3" @submit.prevent="create">
          <input v-model="form.name" class="input" placeholder="Nombre" required />
          <input v-model="form.email" class="input" type="email" placeholder="Email" required />
          <input v-model="form.password" class="input" type="password" placeholder="Contraseña" required minlength="8" />
          <select v-model="form.roleSlug" class="input">
            <option v-for="r in roles" :key="r.slug" :value="r.slug">{{ r.nombre }}</option>
          </select>
          <div class="flex gap-2">
            <button type="submit" class="btn-primary flex-1">Crear</button>
            <button type="button" class="btn-secondary flex-1" @click="showForm = false">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
