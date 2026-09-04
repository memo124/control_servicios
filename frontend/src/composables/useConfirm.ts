import { useConfirmStore } from '@/stores/confirm';
import type { ConfirmOptions } from '@/stores/confirm';

export function useConfirm() {
  const store = useConfirmStore();
  return {
    confirm: (options: ConfirmOptions) => store.open(options),
  };
}
