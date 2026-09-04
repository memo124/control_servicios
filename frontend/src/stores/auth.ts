import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface LoginResult {
  requiresTwoFactor?: boolean;
  tempToken?: string;
  methods?: string[];
  access_token?: string;
  user?: User;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref(localStorage.getItem('token'));
  const loading = ref(false);
  const pending2FA = ref<{ tempToken: string; methods: string[] } | null>(null);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.roles.includes('admin') ?? false);

  function hasPermission(perm: string) {
    return user.value?.permissions.includes(perm) ?? false;
  }

  function setSession(accessToken: string, userData: User) {
    token.value = accessToken;
    user.value = userData;
    localStorage.setItem('token', accessToken);
    pending2FA.value = null;
  }

  async function login(email: string, password: string): Promise<LoginResult> {
    loading.value = true;
    try {
      const { data } = await api.post<LoginResult>('/auth/login', { email, password });
      if (data.requiresTwoFactor && data.tempToken) {
        pending2FA.value = { tempToken: data.tempToken, methods: data.methods ?? [] };
        return data;
      }
      if (data.access_token && data.user) {
        setSession(data.access_token, data.user);
      }
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function verify2FA(code: string) {
    if (!pending2FA.value) throw new Error('No hay 2FA pendiente');
    loading.value = true;
    try {
      const { data } = await api.post('/auth/2fa/verify', {
        tempToken: pending2FA.value.tempToken,
        code,
      });
      setSession(data.access_token, data.user);
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function resendTelegram() {
    if (!pending2FA.value) return;
    await api.post('/auth/2fa/resend-telegram', { tempToken: pending2FA.value.tempToken });
  }

  async function fetchMe() {
    if (!token.value) return;
    const { data } = await api.get('/auth/me');
    user.value = data;
  }

  function logout() {
    token.value = null;
    user.value = null;
    pending2FA.value = null;
    localStorage.removeItem('token');
  }

  function clearPending2FA() {
    pending2FA.value = null;
  }

  return {
    user, token, loading, pending2FA, isAuthenticated, isAdmin,
    hasPermission, login, verify2FA, resendTelegram, fetchMe, logout, setSession, clearPending2FA,
  };
});
