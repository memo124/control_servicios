<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import { useToast } from '@/composables/useToast';
import FormField from '@/components/FormField.vue';
import QrCanvas from '@/components/ui/QrCanvas.vue';

const toast = useToast();
const status = ref<Record<string, unknown>>({});
const telegramChatId = ref('');
const alertasChatId = ref('');
const alertasTelefono = ref('');
const alertasStatus = ref<Record<string, unknown>>({});
const totpCode = ref('');
const totpSetup = ref<{ secret: string; otpauthUrl: string } | null>(null);
const loading = ref(false);

async function loadStatus() {
  const [s, a] = await Promise.all([
    api.get('/auth/2fa/status'),
    api.get('/auth/alertas-dueno/status'),
  ]);
  status.value = s.data;
  alertasStatus.value = a.data;
  if (a.data.alertasDuenoTelegramChatId) alertasChatId.value = String(a.data.alertasDuenoTelegramChatId);
  if (a.data.telefono) alertasTelefono.value = String(a.data.telefono);
}

async function setupAlertasDueno() {
  loading.value = true;
  try {
    await api.post('/auth/alertas-dueno/setup', {
      chatId: alertasChatId.value,
      telefono: alertasTelefono.value || undefined,
    });
    toast.success('Alertas activadas', 'Revisa Telegram para confirmar');
    await loadStatus();
  } catch {
    toast.error('Error', 'No se pudieron activar las alertas');
  } finally {
    loading.value = false;
  }
}

async function disableAlertasDueno() {
  loading.value = true;
  try {
    await api.post('/auth/alertas-dueno/disable');
    toast.warning('Alertas desactivadas');
    await loadStatus();
  } finally {
    loading.value = false;
  }
}

async function setupTelegram() {
  loading.value = true;
  try {
    await api.post('/auth/2fa/setup/telegram', { chatId: telegramChatId.value });
    toast.success('Telegram configurado', 'Revisa tu chat para el código de prueba');
    await loadStatus();
  } catch {
    toast.error('Error', 'No se pudo configurar Telegram');
  } finally {
    loading.value = false;
  }
}

async function startTotpSetup() {
  loading.value = true;
  try {
    const { data } = await api.post('/auth/2fa/setup/totp');
    totpSetup.value = data;
    toast.info('Escanea el QR', 'Usa Google Authenticator o similar');
  } catch {
    toast.error('Error', 'No se pudo iniciar configuración TOTP');
  } finally {
    loading.value = false;
  }
}

async function confirmTotp() {
  loading.value = true;
  try {
    await api.post('/auth/2fa/setup/totp/confirm', { code: totpCode.value });
    toast.success('TOTP activado', 'Autenticador configurado correctamente');
    totpSetup.value = null;
    await loadStatus();
  } catch {
    toast.error('Código inválido', 'Verifica el código de tu app');
  } finally {
    loading.value = false;
  }
}

async function disable2FA() {
  loading.value = true;
  try {
    await api.post('/auth/2fa/disable');
    toast.warning('2FA desactivado', 'Tu cuenta ya no requiere segundo factor');
    await loadStatus();
  } finally {
    loading.value = false;
  }
}

onMounted(loadStatus);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2">Seguridad y 2FA</h1>
    <p class="text-sm text-themed-muted mb-6">
      Protege tu cuenta con códigos por Telegram o app autenticadora (QR).
    </p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Alertas dueño Telegram -->
      <div class="card space-y-4 lg:col-span-2 border-brand/30">
        <h2 class="font-semibold text-brand">Alertas Telegram — Dueño de cuenta</h2>
        <p class="text-sm text-themed-muted">
          Recibe en <b>tu Telegram</b> (no el del cliente) un resumen de clientes en
          <b>días de gracia</b> o <b>vencidos</b> para escribirles por WhatsApp/teléfono.
          Los clientes siguen recibiendo <b>correo</b> por separado.
        </p>
        <p class="text-xs text-themed-muted">
          Obtén tu Chat ID con @userinfobot en Telegram. El teléfono es solo referencia tuya en el sistema.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Chat ID de Telegram" hint="Ej: 123456789">
            <input v-model="alertasChatId" class="input" placeholder="123456789" />
          </FormField>
          <FormField label="Teléfono (referencia)" hint="Opcional — no envía SMS, solo se guarda">
            <input v-model="alertasTelefono" class="input" placeholder="+502 1234-5678" />
          </FormField>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-primary" :disabled="loading || !alertasChatId" @click="setupAlertasDueno">
            Activar alertas de dueño
          </button>
          <button
            v-if="alertasStatus.alertasDuenoTelegramActivo"
            class="btn-secondary border-red-500/40 text-red-400"
            :disabled="loading"
            @click="disableAlertasDueno"
          >
            Desactivar alertas
          </button>
        </div>
        <p v-if="alertasStatus.alertasDuenoTelegramActivo" class="text-sm text-success">
          ✓ Alertas activas{{ alertasStatus.telefono ? ` · Tel. ${alertasStatus.telefono}` : '' }}
        </p>
      </div>

      <!-- Telegram 2FA -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-brand">Telegram</h2>
        <p class="text-sm text-themed-muted">
          Crea un bot con @BotFather, obtén tu Chat ID y configura
          <code class="text-xs">TELEGRAM_BOT_TOKEN</code> en el servidor.
        </p>
        <FormField label="Chat ID de Telegram" hint="Ej: 123456789 (usa @userinfobot para obtenerlo)">
          <input v-model="telegramChatId" class="input" placeholder="123456789" />
        </FormField>
        <button class="btn-primary w-full" :disabled="loading || !telegramChatId" @click="setupTelegram">
          Activar Telegram 2FA
        </button>
        <p v-if="status.telegramEnabled" class="text-sm text-success">✓ Telegram activo</p>
      </div>

      <!-- TOTP / QR -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-brand">App autenticadora (QR)</h2>
        <p class="text-sm text-themed-muted">
          Escanea el QR con Google Authenticator, Authy o similar.
        </p>
        <button v-if="!totpSetup" class="btn-primary w-full" :disabled="loading" @click="startTotpSetup">
          Generar QR de configuración
        </button>
        <template v-if="totpSetup">
          <QrCanvas :value="totpSetup.otpauthUrl" :size="200" />
          <p class="text-xs text-themed-muted break-all">Secreto manual: {{ totpSetup.secret }}</p>
          <FormField label="Código de verificación">
            <input v-model="totpCode" class="input text-center tracking-widest" maxlength="6" placeholder="000000" />
          </FormField>
          <button class="btn-primary w-full" :disabled="totpCode.length !== 6" @click="confirmTotp">
            Confirmar TOTP
          </button>
        </template>
        <p v-if="status.totpEnabled" class="text-sm text-success">✓ TOTP activo</p>
      </div>
    </div>

    <div v-if="status.twoFactorEnabled" class="card mt-6 border-red-500/30">
      <h3 class="font-semibold text-red-400 mb-2">Desactivar 2FA</h3>
      <p class="text-sm text-themed-muted mb-3">Elimina todos los métodos de verificación de tu cuenta.</p>
      <button class="btn-secondary border-red-500/50 text-red-400" @click="disable2FA">Desactivar 2FA</button>
    </div>
  </div>
</template>
