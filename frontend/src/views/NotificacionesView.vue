<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import { useToast } from '@/composables/useToast';
import EstadoBadge from '@/components/EstadoBadge.vue';

interface TelegramDuenoPendiente {
  duenoNombre: string;
  telefono: string | null;
  venceHoy: number;
  enGracia: number;
  vencidas: number;
  total: number;
}

interface DuenoTelegramEstado {
  duenoNombre: string;
  total: number;
  alertasUsuarioActiva: boolean;
  usuarioExiste: boolean;
}

const toast = useToast();
const pendientes = ref<unknown[]>([]);
const historial = ref<unknown[]>([]);
const pendientesTelegram = ref<TelegramDuenoPendiente[]>([]);
const estadoDuenosTelegram = ref<DuenoTelegramEstado[]>([]);
const historialTelegram = ref<unknown[]>([]);
const running = ref(false);
const runningTelegram = ref(false);
const result = ref<{ enqueued: number } | null>(null);
const resultTelegram = ref<{ enviados: number; errores: number } | null>(null);
const mailStatus = ref<Record<string, unknown>>({});

async function load() {
  try {
    const [p, h, pt, ht, ed, ms] = await Promise.all([
      api.get('/notificaciones/pendientes'),
      api.get('/notificaciones/historial'),
      api.get('/notificaciones/telegram-duenos/pendientes'),
      api.get('/notificaciones/telegram-duenos/historial'),
      api.get('/notificaciones/telegram-duenos/estado-duenos'),
      api.get('/notificaciones/mail-status'),
    ]);
    pendientes.value = p.data;
    historial.value = h.data;
    pendientesTelegram.value = pt.data;
    historialTelegram.value = ht.data;
    estadoDuenosTelegram.value = ed.data;
    mailStatus.value = ms.data;
  } catch {
    toast.error('Error al cargar', 'No se pudieron obtener las notificaciones.');
  }
}

async function ejecutar() {
  running.value = true;
  result.value = null;
  try {
    const { data } = await api.post('/notificaciones/ejecutar');
    result.value = data;
    toast.success('Correos', `${data.enqueued} correo(s) encolado(s).`);
    await load();
  } catch (e: unknown) {
    toast.error('Correo a clientes', axiosMessage(e));
  } finally {
    running.value = false;
  }
}

function historialError(h: { respuestaResend?: { error?: string } | null }): string {
  const err = h.respuestaResend?.error;
  if (!err) return '—';
  if (err.includes('only send testing emails')) {
    return 'Resend modo prueba: verifica dominio o usa SMTP en .env';
  }
  return err.replace(/^Error:\s*/, '').slice(0, 120);
}

async function ejecutarTelegramDuenos() {
  runningTelegram.value = true;
  resultTelegram.value = null;
  try {
    const { data } = await api.post('/notificaciones/telegram-duenos/ejecutar');
    resultTelegram.value = data;
    if (data.enviados > 0) {
      toast.success('Telegram dueños', `${data.enviados} mensaje(s) enviado(s).`);
    } else {
      toast.warning(
        'Telegram dueños',
        '0 mensajes: cada dueño debe activar alertas en Seguridad con un usuario cuyo nombre coincida con el dueño de la cuenta (ej. Guillermo).',
      );
    }
    await load();
  } catch (e: unknown) {
    toast.error('Telegram dueños', axiosMessage(e));
  } finally {
    runningTelegram.value = false;
  }
}

function axiosMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const res = (e as {
      response?: { data?: { message?: string | string[] | Record<string, string>; help?: string } };
    }).response;
    const data = res?.data;
    if (data && typeof data.message === 'object' && data.message !== null && 'message' in data.message) {
      const inner = data.message as { message?: string; help?: string };
      return [inner.message, inner.help].filter(Boolean).join(' ');
    }
    const m = data?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
    if (data?.help) return String(data.help);
  }
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: string }).message);
  }
  return 'Revisa TELEGRAM_BOT_TOKEN y alertas activas en Seguridad.';
}

onMounted(load);
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Notificaciones</h1>
        <p class="text-sm text-themed-muted mt-1">
          Correo → clientes · Telegram → grupo del equipo (dueños con alertas activas)
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-secondary" :disabled="runningTelegram" @click="ejecutarTelegramDuenos">
          {{ runningTelegram ? 'Enviando...' : 'Telegram a dueños' }}
        </button>
        <button class="btn-primary" :disabled="running" @click="ejecutar">
          {{ running ? 'Ejecutando...' : 'Correo a clientes' }}
        </button>
      </div>
    </div>

    <div
      v-if="mailStatus.sandboxMode || (mailStatus.configured === false && pendientes.length > 0)"
      class="card text-sm mb-4 border-amber-500/40"
    >
      <p class="font-medium text-amber-600 dark:text-amber-400 mb-1">
        {{ mailStatus.sandboxMode ? 'Correo en modo prueba (Resend)' : 'Correo no listo para enviar' }}
      </p>
      <p class="text-themed-muted text-xs">{{ mailStatus.help }}</p>
      <p v-if="mailStatus.sandboxMode" class="text-themed-muted text-xs mt-2">
        Para enviar a clientes: verifica un dominio en Resend y cambia <code>MAIL_FROM_ADDRESS</code>, o en
        <code>backend/.env</code> usa <code>MAIL_PROVIDER=smtp</code> con Gmail (contraseña de aplicación).
      </p>
    </div>

    <p v-if="result" class="text-success mb-2">{{ result.enqueued }} correos encolados</p>
    <p v-if="resultTelegram" class="text-success mb-4">
      Telegram: {{ resultTelegram.enviados }} enviados, {{ resultTelegram.errores }} error(es)
    </p>

    <h2 class="font-semibold mb-3">Telegram — Dueños con clientes en gracia/vencidos ({{ pendientesTelegram.length }})</h2>
    <p class="text-xs text-themed-muted mb-3">
      Cada dueño activa alertas en <router-link to="/seguridad" class="text-link">Seguridad</router-link>
      (<strong>Activar mis alertas en el grupo</strong>). El <strong>nombre del usuario</strong> debe ser igual al
      <strong>dueño de la cuenta</strong> (campo en Cuentas). Los mensajes van al grupo del .env.
    </p>
    <div
      v-if="estadoDuenosTelegram.length && pendientesTelegram.length === 0"
      class="card text-sm mb-4 border-amber-500/40"
    >
      <p class="font-medium mb-2">Hay clientes pendientes por dueño, pero nadie tiene alertas listas para enviar:</p>
      <ul class="list-disc pl-5 space-y-1 text-themed-muted">
        <li v-for="d in estadoDuenosTelegram" :key="d.duenoNombre">
          <span class="text-themed-fg">{{ d.duenoNombre }}</span> — {{ d.total }} cliente(s)
          <span v-if="!d.usuarioExiste" class="text-cost"> · no hay usuario con ese nombre</span>
          <span v-else-if="!d.alertasUsuarioActiva" class="text-amber-500"> · alertas no activadas en Seguridad</span>
          <span v-else class="text-success"> · listo</span>
        </li>
      </ul>
    </div>
    <div class="space-y-2 mb-8">
      <div v-for="d in pendientesTelegram" :key="d.duenoNombre" class="card text-sm">
        <div class="flex justify-between items-start">
          <div>
            <span class="font-medium">{{ d.duenoNombre }}</span>
            <span v-if="d.telefono" class="text-themed-muted ml-2">{{ d.telefono }}</span>
          </div>
          <span class="text-themed-muted">{{ d.total }} cliente(s)</span>
        </div>
        <div class="flex flex-wrap gap-3 mt-2 text-xs">
          <span v-if="d.venceHoy">⏰ Hoy: {{ d.venceHoy }}</span>
          <span v-if="d.enGracia" class="text-amber-500">⚠️ Gracia: {{ d.enGracia }}</span>
          <span v-if="d.vencidas" class="text-cost">❌ Vencidas: {{ d.vencidas }}</span>
        </div>
      </div>
      <p v-if="pendientesTelegram.length === 0" class="text-themed-muted">Ningún dueño con alertas activas y clientes pendientes.</p>
    </div>

    <h2 class="font-semibold mb-3">Correo — Clientes pendientes ({{ pendientes.length }})</h2>
    <div class="space-y-2 mb-8">
      <div v-for="(p, i) in pendientes" :key="i" class="card flex justify-between items-center text-sm">
        <div>
          <span class="font-medium">{{ (p as any).cliente_nombre }}</span>
          <span class="text-themed-muted ml-2">{{ (p as any).plataforma }}</span>
        </div>
        <EstadoBadge
          :label="(p as any).estado_codigo"
          :codigo="(p as any).estado_codigo"
          :nombre="(p as any).estado_nombre"
          :color-hex="(p as any).color_hex"
        />
      </div>
      <p v-if="pendientes.length === 0" class="text-themed-muted">No hay correos pendientes.</p>
    </div>

    <h2 class="font-semibold mb-3">Historial Telegram dueños</h2>
    <div class="table-wrap card card-flush mb-8">
      <table class="data-table">
        <thead>
          <tr>
            <th>Dueño</th>
            <th>Teléfono</th>
            <th>Clientes</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in historialTelegram" :key="(h as any).id">
            <td>{{ (h as any).duenoNombre }}</td>
            <td class="text-themed-muted">{{ (h as any).telefono ?? '—' }}</td>
            <td>{{ (h as any).suscripcionesCount }}</td>
            <td :class="(h as any).estadoEnvio === 'enviado' ? 'text-success' : 'text-cost'">
              {{ (h as any).estadoEnvio }}
            </td>
            <td class="text-themed-muted">{{ new Date((h as any).createdAt).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 class="font-semibold mb-3">Historial correo clientes</h2>
    <div class="table-wrap card card-flush">
      <table class="data-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Estado</th>
            <th>Detalle</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in historial" :key="(h as any).id">
            <td>{{ (h as any).email }}</td>
            <td :class="(h as any).estadoEnvio === 'enviado' ? 'text-success' : 'text-cost'">
              {{ (h as any).estadoEnvio }}
            </td>
            <td class="text-xs text-themed-muted max-w-xs">{{ historialError(h as any) }}</td>
            <td class="text-themed-muted">{{ new Date((h as any).createdAt).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
