<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import { useToast } from '@/composables/useToast';
import FormField from '@/components/FormField.vue';
import QrCanvas from '@/components/ui/QrCanvas.vue';

const toast = useToast();
const status = ref<Record<string, unknown>>({});
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
  if (a.data.telefono) alertasTelefono.value = String(a.data.telefono);
}

async function setupAlertasDueno() {
  loading.value = true;
  try {
    await api.post('/auth/alertas-dueno/setup', {
      telefono: alertasTelefono.value || undefined,
    });
    toast.success('Alertas activadas', 'Los avisos se publican en el grupo de Telegram');
    await loadStatus();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast.error('Error', msg ?? 'No se pudieron activar las alertas');
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

async function testTelegramGroup() {
  loading.value = true;
  try {
    const { data } = await api.post('/auth/telegram/test-group', {});
    if (data.simulated) {
      toast.warning('Bot no configurado', data.message);
    } else {
      toast.success('Enviado al grupo', data.message);
    }
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast.error('Error', msg ?? 'No se pudo enviar al grupo');
  } finally {
    loading.value = false;
  }
}

async function setupTelegram() {
  loading.value = true;
  try {
    await api.post('/auth/2fa/setup/telegram', {});
    toast.success('Telegram 2FA', 'Código de prueba enviado al grupo');
    await loadStatus();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast.error('Error', msg ?? 'No se pudo configurar Telegram 2FA');
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
      Telegram se configura solo en el servidor (<code class="text-xs">backend/.env</code>).
      No se guardan Chat ID en la base de datos.
    </p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Telegram centralizado -->
      <div class="card space-y-4 lg:col-span-2 border-brand/30">
        <h2 class="font-semibold text-brand">Telegram (grupo del equipo)</h2>
        <p class="text-sm text-themed-muted">
          Todos los mensajes (alertas de dueños, pruebas, códigos 2FA) van al grupo definido en
          <code class="text-xs">TELEGRAM_GROUP_CHAT_ID</code>.
        </p>
        <ul class="text-xs text-themed-muted list-disc pl-5 space-y-1">
          <li><code class="text-xs">TELEGRAM_BOT_TOKEN</code> — token de @BotFather</li>
          <li><code class="text-xs">TELEGRAM_GROUP_CHAT_ID</code> — Id negativo del grupo (ej. -5442163471)</li>
          <li>Agrega el bot al grupo como admin antes de probar</li>
        </ul>
        <p v-if="alertasStatus.groupChatConfigured && alertasStatus.telegramConfigured" class="text-sm text-success">
          ✓ Bot y grupo configurados en el servidor
        </p>
        <p v-else-if="!alertasStatus.telegramConfigured" class="text-sm text-cost">
          ⚠ Falta TELEGRAM_BOT_TOKEN en backend/.env
        </p>
        <p v-else class="text-sm text-cost">
          ⚠ Falta TELEGRAM_GROUP_CHAT_ID en backend/.env
        </p>
        <button
          class="btn-secondary"
          :disabled="loading || !alertasStatus.groupChatConfigured"
          @click="testTelegramGroup"
        >
          Enviar mensaje de prueba al grupo
        </button>
      </div>

      <!-- Alertas dueño -->
      <div class="card space-y-4 lg:col-span-2 border-indigo-500/30">
        <h2 class="font-semibold text-brand">Alertas de dueño en el grupo</h2>
        <p class="text-sm text-themed-muted">
          Activa tu usuario para que, cuando tus clientes estén en gracia o vencidos, se publique
          un resumen en el <b>grupo de Telegram</b> (no al cliente — el cliente recibe correo).
        </p>
        <FormField label="Teléfono (referencia en usuarios)" hint="Opcional — solo se guarda en tu perfil">
          <input v-model="alertasTelefono" class="input" placeholder="+502 1234-5678" />
        </FormField>
        <div class="flex flex-wrap gap-2">
          <button
            class="btn-primary"
            :disabled="loading || !alertasStatus.groupChatConfigured"
            @click="setupAlertasDueno"
          >
            Activar mis alertas en el grupo
          </button>
          <button
            v-if="alertasStatus.alertasDuenoTelegramActivo"
            class="btn-secondary border-red-500/40 text-red-400"
            :disabled="loading"
            @click="disableAlertasDueno"
          >
            Desactivar mis alertas
          </button>
        </div>
        <p v-if="alertasStatus.alertasDuenoTelegramActivo" class="text-sm text-success">
          ✓ Tus alertas están activas{{ alertasTelefono ? ` · Tel. ${alertasTelefono}` : '' }}
        </p>
      </div>

      <!-- Telegram 2FA -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-brand">2FA por Telegram</h2>
        <p class="text-sm text-themed-muted">
          Los códigos de login se envían al <b>grupo</b> (con tu nombre). Requiere grupo configurado en .env.
        </p>
        <button
          class="btn-primary w-full"
          :disabled="loading || !alertasStatus.groupChatConfigured"
          @click="setupTelegram"
        >
          Activar Telegram 2FA
        </button>
        <p v-if="status.telegramEnabled" class="text-sm text-success">✓ Telegram 2FA activo</p>
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
