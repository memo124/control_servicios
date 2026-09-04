import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

let nextId = 1;

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([]);

  function show(type: ToastType, title: string, message?: string, duration = 4000) {
    const id = nextId++;
    items.value.push({ id, type, title, message, duration });
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }

  function success(title: string, message?: string) {
    return show('success', title, message);
  }

  function error(title: string, message?: string) {
    return show('error', title, message, 6000);
  }

  function warning(title: string, message?: string) {
    return show('warning', title, message);
  }

  function info(title: string, message?: string) {
    return show('info', title, message);
  }

  function dismiss(id: number) {
    items.value = items.value.filter((t) => t.id !== id);
  }

  return { items, show, success, error, warning, info, dismiss };
});
