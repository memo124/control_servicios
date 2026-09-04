<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';
import { useToast } from '@/composables/useToast';
import FormField from '@/components/FormField.vue';

const toast = useToast();
const route = useRoute();

const sessionId = ref('');
const token = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);

onMounted(() => {
  sessionId.value = String(route.query.session ?? '');
  token.value = String(route.query.token ?? '');
});

async function authorize() {
  if (!sessionId.value || !token.value) {
    toast.error('Enlace inválido', 'QR corrupto o expirado');
    return;
  }
  loading.value = true;
  try {
    await api.post(`/auth/qr/session/${sessionId.value}/authorize`, {
      token: token.value,
      email: email.value,
      password: password.value,
    });
    toast.success('Autorizado', 'Este dispositivo puede cerrar la ventana');
  } catch {
    toast.error('Error', 'No se pudo autorizar la sesión');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 page-gradient">
    <div class="card w-full max-w-md">
      <h1 class="text-xl font-bold mb-2">Autorizar acceso QR</h1>
      <p class="text-sm text-themed-muted mb-4">
        Confirma tu identidad para autorizar el inicio de sesión en otro dispositivo.
      </p>
      <form class="space-y-4" @submit.prevent="authorize">
        <FormField label="Email" required>
          <input v-model="email" type="email" class="input" required />
        </FormField>
        <FormField label="Contraseña" required>
          <input v-model="password" type="password" class="input" required />
        </FormField>
        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Autorizando...' : 'Autorizar acceso' }}
        </button>
      </form>
    </div>
  </div>
</template>
