<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import QrCanvas from '@/components/ui/QrCanvas.vue';
import api from '@/services/api';

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

const email = ref('admin@controlservicios.local');
const password = ref('Admin123!');
const code2fa = ref('');
const step = ref<'credentials' | '2fa' | 'qr'>('credentials');

const qrSessionId = ref('');
const qrToken = ref('');
const qrPayload = ref('');
let pollInterval: ReturnType<typeof setInterval> | null = null;

async function submit() {
  try {
    const result = await auth.login(email.value, password.value);
    if (result.requiresTwoFactor) {
      step.value = '2fa';
      toast.info('Verificación 2FA', 'Ingresa el código de tu autenticador o Telegram');
      return;
    }
    toast.success('Bienvenido', 'Sesión iniciada correctamente');
    router.push('/');
  } catch {
    toast.error('Error de acceso', 'Credenciales inválidas');
  }
}

async function submit2FA() {
  try {
    await auth.verify2FA(code2fa.value);
    toast.success('Verificado', 'Autenticación completada');
    router.push('/');
  } catch {
    toast.error('Código inválido', 'Revisa el código e intenta de nuevo');
  }
}

async function resendTelegram() {
  try {
    await auth.resendTelegram();
    toast.success('Enviado', 'Nuevo código enviado a Telegram');
  } catch {
    toast.error('Error', 'No se pudo reenviar el código');
  }
}

async function startQrLogin() {
  step.value = 'qr';
  try {
    const { data } = await api.post('/auth/qr/session');
    qrSessionId.value = data.sessionId;
    qrToken.value = data.token;
    const base = window.location.origin;
    qrPayload.value = `${base}/qr-auth?session=${data.sessionId}&token=${data.token}`;
    startPolling();
  } catch {
    toast.error('Error QR', 'No se pudo generar la sesión');
    step.value = 'credentials';
  }
}

function startPolling() {
  stopPolling();
  pollInterval = setInterval(async () => {
    try {
      const { data } = await api.post(`/auth/qr/session/${qrSessionId.value}/poll`, {
        token: qrToken.value,
      });
      if (data.status === 'completed' && data.access_token && data.user) {
        auth.setSession(data.access_token, data.user);
        stopPolling();
        toast.success('Acceso QR', 'Sesión autorizada desde tu dispositivo');
        router.push('/');
      } else if (data.status === 'expired') {
        stopPolling();
        toast.warning('QR expirado', 'Genera uno nuevo');
        step.value = 'credentials';
      }
    } catch { /* ignore poll errors */ }
  }, 2000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function backToLogin() {
  stopPolling();
  step.value = 'credentials';
  auth.clearPending2FA();
}

onUnmounted(stopPolling);
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 page-gradient">
    <div class="absolute top-4 right-4">
      <ThemeToggle />
    </div>

    <div class="card w-full max-w-md">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-indigo-500">Control Servicios</h1>
        <p class="text-themed-muted text-sm mt-1">Panel de administración de suscripciones</p>
      </div>

      <!-- Paso 1: credenciales -->
      <form v-if="step === 'credentials'" class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="block text-sm text-themed-muted mb-1">Email</label>
          <input v-model="email" type="email" class="input" required />
        </div>
        <div>
          <label class="block text-sm text-themed-muted mb-1">Contraseña</label>
          <input v-model="password" type="password" class="input" required />
        </div>
        <button type="submit" class="btn-primary w-full" :disabled="auth.loading">
          {{ auth.loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
        <button type="button" class="btn-secondary w-full" @click="startQrLogin">
          Ingresar con QR
        </button>
      </form>

      <!-- Paso 2: 2FA -->
      <form v-else-if="step === '2fa'" class="space-y-4" @submit.prevent="submit2FA">
        <p class="text-sm text-themed-muted">
          Ingresa el código de 6 dígitos
          <span v-if="auth.pending2FA?.methods.includes('telegram')"> enviado a Telegram</span>
          <span v-if="auth.pending2FA?.methods.includes('totp')"> de tu app autenticadora</span>.
        </p>
        <input
          v-model="code2fa"
          class="input text-center text-2xl tracking-widest"
          maxlength="6"
          pattern="[0-9]{6}"
          placeholder="000000"
          required
        />
        <button type="submit" class="btn-primary w-full" :disabled="auth.loading">Verificar</button>
        <button
          v-if="auth.pending2FA?.methods.includes('telegram')"
          type="button"
          class="btn-secondary w-full text-sm"
          @click="resendTelegram"
        >
          Reenviar código Telegram
        </button>
        <button type="button" class="text-sm text-themed-muted w-full" @click="backToLogin">← Volver</button>
      </form>

      <!-- Paso QR -->
      <div v-else-if="step === 'qr'" class="space-y-4 text-center">
        <p class="text-sm text-themed-muted">
          Escanea con tu teléfono o abre el enlace para autorizar este equipo.
        </p>
        <QrCanvas v-if="qrPayload" :value="qrPayload" />
        <p class="text-xs text-themed-muted break-all">{{ qrPayload }}</p>
        <p class="text-xs text-amber-500 animate-pulse">Esperando autorización...</p>
        <button type="button" class="btn-secondary w-full" @click="backToLogin">Cancelar</button>
      </div>
    </div>
  </div>
</template>
