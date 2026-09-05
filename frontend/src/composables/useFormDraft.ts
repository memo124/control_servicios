import { watch, onMounted, type Ref } from 'vue';

const DRAFT_PREFIX = 'form_draft:';

export function useFormDraft<T extends Record<string, unknown>>(
  key: string,
  form: Ref<T>,
  options?: { enabled?: Ref<boolean> | (() => boolean) },
) {
  const storageKey = `${DRAFT_PREFIX}${key}`;

  function isEnabled(): boolean {
    if (!options?.enabled) return true;
    if (typeof options.enabled === 'function') return options.enabled();
    return options.enabled.value;
  }

  function save() {
    if (!isEnabled()) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(form.value));
    } catch {
      /* quota exceeded — ignore */
    }
  }

  function restore(): boolean {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as T;
      form.value = { ...form.value, ...parsed };
      return true;
    } catch {
      sessionStorage.removeItem(storageKey);
      return false;
    }
  }

  function clear() {
    sessionStorage.removeItem(storageKey);
  }

  onMounted(() => restore());

  watch(form, save, { deep: true });

  return { restore, clear, save };
}
