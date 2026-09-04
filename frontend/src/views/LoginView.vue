<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const email = ref('admin@controlservicios.local');
const password = ref('Admin123!');
const error = ref('');

async function submit() {
  error.value = '';
  try {
    await auth.login(email.value, password.value);
    router.push('/');
  } catch {
    error.value = 'Credenciales inválidas';
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
    <div class="card w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-indigo-400">Control Servicios</h1>
        <p class="text-slate-400 text-sm mt-1">Panel de administración de suscripciones</p>
      </div>
      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="block text-sm text-slate-400 mb-1">Email</label>
          <input v-model="email" type="email" class="input" required />
        </div>
        <div>
          <label class="block text-sm text-slate-400 mb-1">Contraseña</label>
          <input v-model="password" type="password" class="input" required />
        </div>
        <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>
        <button type="submit" class="btn-primary w-full" :disabled="auth.loading">
          {{ auth.loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>
    </div>
  </div>
</template>
