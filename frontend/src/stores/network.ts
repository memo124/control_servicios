import { defineStore } from 'pinia';
import { ref, onScopeDispose } from 'vue';

export const useNetworkStore = defineStore('network', () => {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const offlineNotified = ref(false);

  function setOnline(value: boolean) {
    isOnline.value = value;
    if (value) offlineNotified.value = false;
  }

  function onOnline() {
    setOnline(true);
  }

  function onOffline() {
    setOnline(false);
  }

  function init() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    isOnline.value = navigator.onLine;
  }

  function destroy() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  }

  return { isOnline, offlineNotified, setOnline, init, destroy };
});

export function useNetworkListener() {
  const network = useNetworkStore();
  network.init();
  onScopeDispose(() => network.destroy());
}
