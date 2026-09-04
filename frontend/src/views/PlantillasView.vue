<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import api from '@/services/api';

interface Plantilla {
  id: number;
  codigo: string;
  asunto: string;
  cuerpoHtml: string;
  variablesDisponibles: string[];
  activo: boolean;
}

const plantillas = ref<Plantilla[]>([]);
const selected = ref<Plantilla | null>(null);
const asunto = ref('');
const cuerpoHtml = ref('');
const previewHtml = ref('');
const previewAsunto = ref('');
const saving = ref(false);

const sampleVars: Record<string, string> = {
  cliente_nombre: 'Melissa',
  plataforma: 'Spotify',
  perfil_nombre: 'Melissa',
  precio_cobro: '3.00',
  fecha_corte: '2026-05-04',
  dias_gracia: '3',
  fecha_limite_gracia: '2026-05-07',
  estado_nombre: 'Vence Hoy',
  color_hex: '#ffc107',
};

async function load() {
  const { data } = await api.get('/plantillas');
  plantillas.value = data;
  if (data.length) selectPlantilla(data[0]);
}

function selectPlantilla(p: Plantilla) {
  selected.value = p;
  asunto.value = p.asunto;
  cuerpoHtml.value = p.cuerpoHtml;
  updatePreview();
}

function updatePreview() {
  let html = cuerpoHtml.value;
  let subj = asunto.value;
  for (const [k, v] of Object.entries(sampleVars)) {
    html = html.split(`{{${k}}}`).join(v);
    subj = subj.split(`{{${k}}}`).join(v);
  }
  previewHtml.value = html;
  previewAsunto.value = subj;
}

async function save() {
  if (!selected.value) return;
  saving.value = true;
  await api.patch(`/plantillas/${selected.value.id}`, { asunto: asunto.value, cuerpoHtml: cuerpoHtml.value });
  saving.value = false;
  await load();
}

watch([asunto, cuerpoHtml], updatePreview);
onMounted(load);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Editor de Plantillas de Correo</h1>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="space-y-4">
        <select class="input" @change="selectPlantilla(plantillas.find(p => p.id === +($event.target as HTMLSelectElement).value)!)" :value="selected?.id">
          <option v-for="p in plantillas" :key="p.id" :value="p.id">{{ p.codigo }}</option>
        </select>

        <div>
          <label class="text-sm text-slate-400">Asunto</label>
          <input v-model="asunto" class="input mt-1" />
        </div>

        <div>
          <label class="text-sm text-slate-400">Cuerpo HTML</label>
          <textarea v-model="cuerpoHtml" class="input mt-1 font-mono text-xs h-64" />
        </div>

        <div class="text-xs text-slate-500">
          Variables: {{ selected?.variablesDisponibles?.join(', ') }}
        </div>

        <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? 'Guardando...' : 'Guardar plantilla' }}</button>
      </div>

      <div class="card">
        <h2 class="font-semibold mb-2">Vista previa</h2>
        <p class="text-sm text-slate-400 mb-4">Asunto: {{ previewAsunto }}</p>
        <div class="bg-white rounded-lg overflow-hidden border border-slate-700">
          <iframe :srcdoc="previewHtml" class="w-full h-[500px] bg-white" title="Preview" />
        </div>
      </div>
    </div>
  </div>
</template>
