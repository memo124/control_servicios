import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type ThemeMode = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'cs-theme';

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function applyTheme(resolved: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>((localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system');
  const resolved = ref<'dark' | 'light'>(resolveTheme(mode.value));

  function setMode(newMode: ThemeMode) {
    mode.value = newMode;
    localStorage.setItem(STORAGE_KEY, newMode);
    resolved.value = resolveTheme(newMode);
    applyTheme(resolved.value);
  }

  function init() {
    applyTheme(resolveTheme(mode.value));
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      if (mode.value === 'system') {
        resolved.value = resolveTheme('system');
        applyTheme(resolved.value);
      }
    });
  }

  watch(mode, () => {
    resolved.value = resolveTheme(mode.value);
    applyTheme(resolved.value);
  });

  return { mode, resolved, setMode, init };
});
