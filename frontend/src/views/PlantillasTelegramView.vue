<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import api from '@/services/api';
import { useToast } from '@/composables/useToast';

interface PlantillaTelegram {
  id: number;
  codigo: string;
  titulo: string;
  cuerpoTexto: string;
  variablesDisponibles: string[];
  activo: boolean;
}

const toast = useToast();
const plantillas = ref<PlantillaTelegram[]>([]);
const selected = ref<PlantillaTelegram | null>(null);
const titulo = ref('');
const cuerpoTexto = ref('');
const previewTexto = ref('');
const saving = ref(false);
const sendingTest = ref(false);

const sampleVars: Record<string, string> = {
  code: '123456',
  dueno_nombre: 'Guillermo',
};

async function load() {
  const { data } = await api.get('/plantillas-telegram');
  plantillas.value = data;
  if (data.length) selectPlantilla(data[0]);
}

function selectPlantilla(p: PlantillaTelegram) {
  selected.value = p;
  titulo.value = p.titulo;
  cuerpoTexto.value = p.cuerpoTexto;
  updatePreview();
}

function updatePreview() {
  let text = cuerpoTexto.value;
  for (const [k, v] of Object.entries(sampleVars)) {
    text = text.split(`{{${k}}}`).join(v);
  }
  previewTexto.value = text;
}

async function save() {
  if (!selected.value) return;
  saving.value = true;
  try {
    await api.patch(`/plantillas-telegram/${selected.value.id}`, {
      titulo: titulo.value,
      cuerpoTexto: cuerpoTexto.value,
    });
    toast.success('Plantilla guardada');
    await load();
  } catch {
    toast.error('Error', 'No se pudo guardar la plantilla');
  } finally {
    saving.value = false;
  }
}

async function sendTest() {
  if (!selected.value) return;
  sendingTest.value = true;
  try {
    const { data } = await api.post(`/plantillas-telegram/${selected.value.id}/enviar-prueba`, {
      variables: sampleVars,
    });
    if (data.simulated) {
      toast.warning('Simulado', data.error ?? 'Configura TELEGRAM_BOT_TOKEN en el servidor');
    } else if (data.ok) {
      toast.success('Enviado', `Revisa Telegram (chat ${data.chatId})`);
    } else {
      toast.error('Error Telegram', data.error ?? 'No se pudo enviar');
    }
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast.error('Error', msg ?? 'No se pudo enviar la prueba');
  } finally {
    sendingTest.value = false;
  }
}

watch([titulo, cuerpoTexto], updatePreview);
onMounted(load);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2">Plantillas de Telegram</h1>
    <p class="text-sm text-themed-muted mb-6">
      Mensajes HTML para el bot (<code class="text-xs">parse_mode: HTML</code>).
      Usa variables <code class="text-xs" v-pre>{{nombre}}</code>.
    </p>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="space-y-4">
        <select
          class="input"
          :value="selected?.id"
          @change="selectPlantilla(plantillas.find(p => p.id === +($event.target as HTMLSelectElement).value)!)"
        >
          <option v-for="p in plantillas" :key="p.id" :value="p.id">{{ p.codigo }} — {{ p.titulo }}</option>
        </select>

        <div>
          <label class="text-sm text-themed-muted">Título (referencia interna)</label>
          <input v-model="titulo" class="input mt-1" />
        </div>

        <div>
          <label class="text-sm text-themed-muted">Cuerpo del mensaje</label>
          <textarea v-model="cuerpoTexto" class="input mt-1 font-mono text-xs h-64" />
        </div>

        <div class="text-xs text-themed-muted">
          Variables: {{ selected?.variablesDisponibles?.length ? selected.variablesDisponibles.join(', ') : '(ninguna)' }}
        </div>

        <div class="flex flex-wrap gap-2">
          <button class="btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar plantilla' }}
          </button>
        </div>

        <div class="card space-y-3 border-brand/30">
          <h2 class="font-semibold text-sm">Enviar prueba al grupo</h2>
          <p class="text-xs text-themed-muted">
            Usa <code class="text-xs">TELEGRAM_GROUP_CHAT_ID</code> del servidor. No hace falta Chat ID manual.
          </p>
          <button class="btn-secondary w-full" :disabled="sendingTest" @click="sendTest">
            {{ sendingTest ? 'Enviando...' : 'Enviar esta plantilla a Telegram' }}
          </button>
        </div>
      </div>

      <div class="card">
        <h2 class="font-semibold mb-2">Vista previa</h2>
        <div
          class="rounded-lg border border-themed p-4 text-sm whitespace-pre-wrap bg-themed-muted/20 min-h-[300px]"
          v-html="previewTexto"
        />
      </div>
    </div>
  </div>
</template>
