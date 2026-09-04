import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
}

export const useConfirmStore = defineStore('confirm', () => {
  const visible = ref(false);
  const options = ref<ConfirmOptions>({
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variant: 'primary',
  });
  let resolver: ((value: boolean) => void) | null = null;

  function open(opts: ConfirmOptions): Promise<boolean> {
    options.value = {
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      variant: 'primary',
      ...opts,
    };
    visible.value = true;
    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  function confirmAction() {
    visible.value = false;
    resolver?.(true);
    resolver = null;
  }

  function cancelAction() {
    visible.value = false;
    resolver?.(false);
    resolver = null;
  }

  return { visible, options, open, confirmAction, cancelAction };
});
