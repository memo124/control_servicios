import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useToastStore } from '@/stores/toast';
import { useNetworkStore } from '@/stores/network';

const MAX_RETRIES = 3;
const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504]);
const RETRYABLE_METHODS = new Set(['get', 'head', 'options', 'put', 'delete']);

interface RetryConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

function browserOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

function isNetworkError(err: AxiosError): boolean {
  return !err.response && (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || err.message === 'Network Error');
}

function shouldRetry(err: AxiosError, config: RetryConfig): boolean {
  const method = (config.method ?? 'get').toLowerCase();
  const count = config.__retryCount ?? 0;
  if (count >= MAX_RETRIES) return false;
  if (isNetworkError(err)) return true;
  if (err.response && RETRYABLE_STATUSES.has(err.response.status)) {
    return RETRYABLE_METHODS.has(method) || method === 'post';
  }
  return false;
}

function retryDelay(count: number): number {
  return Math.min(1000 * 2 ** count, 8000);
}

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Solo bloquear si el navegador reporta sin red (no por fallos previos del servidor)
  if (browserOffline()) {
    const network = useNetworkStore();
    if (!network.offlineNotified) {
      network.offlineNotified = true;
      useToastStore().warning('Sin conexión', 'No hay internet. Revisa tu red e intenta de nuevo.');
    }
    return Promise.reject(new axios.Cancel('Sin conexión a internet'));
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const network = useNetworkStore();
    network.setOnline(true);
    return response;
  },
  async (err: AxiosError) => {
    const config = err.config as RetryConfig | undefined;
    const network = useNetworkStore();
    const toast = useToastStore();

    if (axios.isCancel(err)) {
      return Promise.reject(err);
    }

    if (isNetworkError(err)) {
      if (browserOffline()) {
        network.setOnline(false);
        if (!network.offlineNotified) {
          network.offlineNotified = true;
          toast.warning('Sin conexión', 'No hay internet. Los datos del formulario se conservan localmente.');
        }
      } else if (!network.offlineNotified) {
        toast.error(
          'No se pudo conectar',
          'El servidor no respondió. Verifica que el backend esté activo (npm run dev).',
        );
        network.offlineNotified = true;
        setTimeout(() => { network.offlineNotified = false; }, 5000);
      }
    }

    if (config && shouldRetry(err, config)) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      const delay = retryDelay(config.__retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api.request(config);
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(err);
  },
);

export default api;
