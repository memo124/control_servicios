<script setup lang="ts">
import { useConfirmStore } from '@/stores/confirm';
import { AlertTriangle } from 'lucide-vue-next';

const store = useConfirmStore();

const variantBtn = {
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  warning: 'bg-amber-600 hover:bg-amber-500 text-white',
  primary: 'btn-primary',
};
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div v-if="store.visible" class="confirm-overlay" @click.self="store.cancelAction()">
        <div class="confirm-dialog card" role="alertdialog" aria-modal="true">
          <div class="flex items-start gap-3 mb-4">
            <div
              :class="[
                'p-2 rounded-lg shrink-0',
                store.options.variant === 'danger' ? 'bg-red-500/15 text-red-400' :
                store.options.variant === 'warning' ? 'bg-amber-500/15 text-amber-400' :
                'bg-indigo-500/15 text-indigo-400',
              ]"
            >
              <AlertTriangle class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-themed-primary">{{ store.options.title }}</h3>
              <p class="text-sm text-themed-muted mt-1">{{ store.options.message }}</p>
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button type="button" class="btn-secondary" @click="store.cancelAction()">
              {{ store.options.cancelText }}
            </button>
            <button
              type="button"
              :class="['px-4 py-2 rounded-lg font-medium transition-colors', variantBtn[store.options.variant ?? 'primary']]"
              @click="store.confirmAction()"
            >
              {{ store.options.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  width: 100%;
  max-width: 28rem;
  animation: confirm-in 0.2s ease;
}

@keyframes confirm-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.confirm-enter-active,
.confirm-leave-active { transition: opacity 0.2s; }
.confirm-enter-from,
.confirm-leave-to { opacity: 0; }
</style>
