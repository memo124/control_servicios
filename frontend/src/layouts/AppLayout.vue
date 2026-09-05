<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import {
  LayoutDashboard, Users, CreditCard, Building2, Mail, UserCog, Bell, Info, Menu, X, LogOut, Shield, Send,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';

const auth = useAuthStore();
const route = useRoute();
const sidebarOpen = ref(false);
const sidebarCollapsed = ref(false);

const navItems = computed(() => [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', show: auth.hasPermission('finanzas.ver') },
  { to: '/suscripciones', icon: CreditCard, label: 'Suscripciones', show: auth.hasPermission('suscripciones.ver') },
  { to: '/clientes', icon: Users, label: 'Clientes', show: auth.hasPermission('clientes.gestionar') || auth.hasPermission('suscripciones.ver') },
  { to: '/cuentas', icon: Building2, label: 'Cuentas', show: auth.hasPermission('cuentas.gestionar') },
  { to: '/plantillas', icon: Mail, label: 'Plantillas correo', show: auth.hasPermission('plantillas.editar') },
  { to: '/plantillas-telegram', icon: Send, label: 'Plantillas Telegram', show: auth.hasPermission('plantillas.editar') },
  { to: '/notificaciones', icon: Bell, label: 'Notificaciones', show: auth.hasPermission('correos.enviar') },
  { to: '/seguridad', icon: Shield, label: 'Seguridad', show: true },
  { to: '/usuarios', icon: UserCog, label: 'Usuarios', show: auth.hasPermission('usuarios.gestionar') },
  { to: '/version', icon: Info, label: 'Versión', show: true },
].filter((i) => i.show));

function isActive(path: string) {
  return path === '/' ? route.path === '/' : route.path.startsWith(path);
}
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row bg-themed">
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 modal-overlay z-40 lg:hidden"
      @click="sidebarOpen = false"
    />

    <aside
      :class="[
        'sidebar fixed lg:sticky top-0 h-screen z-50 flex flex-col transition-all duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        sidebarCollapsed ? 'lg:w-16' : 'w-64',
      ]"
    >
      <div class="p-4 flex items-center justify-between border-b border-themed">
        <h1 v-if="!sidebarCollapsed" class="font-bold text-lg text-brand">Control Servicios</h1>
        <button class="hidden lg:block p-1 text-themed-muted hover:text-themed-primary" @click="sidebarCollapsed = !sidebarCollapsed">
          <Menu v-if="sidebarCollapsed" class="w-5 h-5" />
          <X v-else class="w-5 h-5" />
        </button>
        <button class="lg:hidden p-1 text-themed-primary" @click="sidebarOpen = false"><X class="w-5 h-5" /></button>
      </div>

      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="['nav-link', isActive(item.to) && 'nav-link-active']"
          @click="sidebarOpen = false"
        >
          <component :is="item.icon" class="w-5 h-5 shrink-0" />
          <span v-if="!sidebarCollapsed">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="p-4 border-t border-themed space-y-3">
        <ThemeToggle v-if="!sidebarCollapsed" />
        <div v-if="!sidebarCollapsed" class="text-xs text-themed-muted truncate">{{ auth.user?.email }}</div>
        <button class="btn-secondary w-full flex items-center justify-center gap-2 text-sm" @click="auth.logout(); $router.push('/login')">
          <LogOut class="w-4 h-4" />
          <span v-if="!sidebarCollapsed">Salir</span>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-h-screen">
      <header class="mobile-header lg:hidden sticky top-0 z-30 backdrop-blur px-4 py-3 flex items-center gap-3">
        <button class="text-themed-primary" @click="sidebarOpen = true"><Menu class="w-6 h-6" /></button>
        <span class="font-semibold text-brand">Control Servicios</span>
      </header>

      <main class="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
        <RouterView />
      </main>

      <nav class="mobile-nav lg:hidden fixed bottom-0 inset-x-0 flex justify-around py-2 z-30">
        <RouterLink
          v-for="item in navItems.slice(0, 5)"
          :key="item.to"
          :to="item.to"
          :class="['flex flex-col items-center gap-0.5 px-2 py-1 text-xs', isActive(item.to) ? 'text-brand' : 'text-themed-muted']"
        >
          <component :is="item.icon" class="w-5 h-5" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="lg:hidden h-16" />
    </div>
  </div>
</template>
