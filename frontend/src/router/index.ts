import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'suscripciones', name: 'suscripciones', component: () => import('@/views/SuscripcionesView.vue') },
        { path: 'clientes', name: 'clientes', component: () => import('@/views/ClientesView.vue') },
        { path: 'cuentas', name: 'cuentas', component: () => import('@/views/CuentasView.vue') },
        { path: 'plantillas', name: 'plantillas', component: () => import('@/views/PlantillasView.vue') },
        { path: 'usuarios', name: 'usuarios', component: () => import('@/views/UsuariosView.vue') },
        { path: 'notificaciones', name: 'notificaciones', component: () => import('@/views/NotificacionesView.vue') },
        { path: 'version', name: 'version', component: () => import('@/views/VersionView.vue') },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) return '/login';
  if (to.meta.guest && auth.isAuthenticated) return '/';
  if (auth.isAuthenticated && !auth.user) await auth.fetchMe();
});

export default router;
