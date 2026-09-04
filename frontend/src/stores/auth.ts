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

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref(localStorage.getItem('token'));
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.roles.includes('admin') ?? false);

  function hasPermission(perm: string) {
    return user.value?.permissions.includes(perm) ?? false;
  }

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      const { data } = await api.post('/auth/login', { email, password });
      token.value = data.access_token;
      user.value = data.user;
      localStorage.setItem('token', data.access_token);
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe() {
    if (!token.value) return;
    const { data } = await api.get('/auth/me');
    user.value = data;
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
  }

  return { user, token, loading, isAuthenticated, isAdmin, hasPermission, login, fetchMe, logout };
});
