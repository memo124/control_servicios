<script setup lang="ts">
import { useToastStore } from '@/stores/toast';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next';

const store = useToastStore();

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  error: 'border-red-500/50 bg-red-500/10 text-red-400',
  warning: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
  info: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
};
</script>

<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="toast in store.items"
        :key="toast.id"
        :class="['toast-item', colors[toast.type]]"
        role="alert"
      >
        <component :is="icons[toast.type]" class="w-5 h-5 shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm text-themed-primary">{{ toast.title }}</p>
          <p v-if="toast.message" class="text-xs text-themed-muted mt-0.5">{{ toast.message }}</p>
        </div>
        <button class="toast-close" aria-label="Cerrar" @click="store.dismiss(toast.id)">
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: min(24rem, calc(100vw - 2rem));
  pointer-events: none;
}

.toast-item {
  pointer-events: auto;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.875rem 1rem;
  border-radius: 0.75rem;
  border-width: 1px;
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}

.toast-close {
  color: var(--color-text-muted);
  opacity: 0.7;
  transition: opacity 0.15s;
}
.toast-close:hover { opacity: 1; }

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}
</style>
