<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import {
  LayoutDashboard, Users, CreditCard, Building2, Mail, UserCog, Bell, Info, Menu, X, LogOut,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const sidebarOpen = ref(false);
const sidebarCollapsed = ref(false);

const navItems = computed(() => [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', show: auth.hasPermission('finanzas.ver') },
  { to: '/suscripciones', icon: CreditCard, label: 'Suscripciones', show: auth.hasPermission('suscripciones.ver') },
  { to: '/clientes', icon: Users, label: 'Clientes', show: auth.hasPermission('clientes.gestionar') || auth.hasPermission('suscripciones.ver') },
  { to: '/cuentas', icon: Building2, label: 'Cuentas', show: auth.hasPermission('cuentas.gestionar') },
  { to: '/plantillas', icon: Mail, label: 'Plantillas', show: auth.hasPermission('plantillas.editar') },
  { to: '/notificaciones', icon: Bell, label: 'Notificaciones', show: auth.hasPermission('correos.enviar') },
  { to: '/usuarios', icon: UserCog, label: 'Usuarios', show: auth.hasPermission('usuarios.gestionar') },
  { to: '/version', icon: Info, label: 'Versión', show: true },
].filter((i) => i.show));

function isActive(path: string) {
  return path === '/' ? route.path === '/' : route.path.startsWith(path);
}
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row">
    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/60 z-40 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed lg:sticky top-0 h-screen z-50 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        sidebarCollapsed ? 'lg:w-16' : 'w-64',
      ]"
    >
      <div class="p-4 flex items-center justify-between border-b border-slate-800">
        <h1 v-if="!sidebarCollapsed" class="font-bold text-lg text-indigo-400">Control Servicios</h1>
        <button class="hidden lg:block p-1 text-slate-400 hover:text-white" @click="sidebarCollapsed = !sidebarCollapsed">
          <Menu v-if="sidebarCollapsed" class="w-5 h-5" />
          <X v-else class="w-5 h-5" />
        </button>
        <button class="lg:hidden p-1" @click="sidebarOpen = false"><X class="w-5 h-5" /></button>
      </div>

      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive(item.to) ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
          ]"
          @click="sidebarOpen = false"
        >
          <component :is="item.icon" class="w-5 h-5 shrink-0" />
          <span v-if="!sidebarCollapsed">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="p-4 border-t border-slate-800">
        <div v-if="!sidebarCollapsed" class="text-xs text-slate-500 mb-2 truncate">{{ auth.user?.email }}</div>
        <button class="btn-secondary w-full flex items-center justify-center gap-2 text-sm" @click="auth.logout(); $router.push('/login')">
          <LogOut class="w-4 h-4" />
          <span v-if="!sidebarCollapsed">Salir</span>
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-h-screen">
      <header class="lg:hidden sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <button @click="sidebarOpen = true"><Menu class="w-6 h-6" /></button>
        <span class="font-semibold text-indigo-400">Control Servicios</span>
      </header>

      <main class="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
        <RouterView />
      </main>

      <!-- Mobile bottom nav -->
      <nav class="lg:hidden fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 flex justify-around py-2 z-30">
        <RouterLink
          v-for="item in navItems.slice(0, 5)"
          :key="item.to"
          :to="item.to"
          :class="['flex flex-col items-center gap-0.5 px-2 py-1 text-xs', isActive(item.to) ? 'text-indigo-400' : 'text-slate-500']"
        >
          <component :is="item.icon" class="w-5 h-5" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="lg:hidden h-16" />
    </div>
  </div>
</template>
