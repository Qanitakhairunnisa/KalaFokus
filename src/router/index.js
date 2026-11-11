// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useKalaFokus } from '../composables/useKalaFokus';

import DashboardView from '../views/DashboardView.vue';
import FocusView from '../views/FocusView.vue';
import TasksView from '../views/TasksView.vue';
import BrainfallView from '../views/BrainfallView.vue';
import AiInsightView from '../views/AiInsightView.vue';
import AuthView from '../views/AuthView.vue';

const routes = [
    {
        path: '/auth',
        name: 'auth',
        component: AuthView,
        meta: { title: 'Masuk ke Akun', viewKey: 'auth', requiresGuest: true }
    },
    {
        path: '/',
        name: 'dashboard',
        component: DashboardView,
        meta: { title: 'Dashboard', viewKey: 'dashboard', requiresAuth: true }
    },
    {
        path: '/focus',
        name: 'focus',
        component: FocusView,
        meta: { title: 'Mode Fokus', viewKey: 'focus', requiresAuth: true }
    },
    {
        path: '/tasks',
        name: 'tasks',
        component: TasksView,
        meta: { title: 'Manajemen Tugas', viewKey: 'tasks', requiresAuth: true }
    },
    {
        path: '/brainfall',
        name: 'brainfall',
        component: BrainfallView,
        meta: { title: 'BrainFall Tracker', viewKey: 'brainfall', requiresAuth: true }
    },
    {
        path: '/ai-insight',
        name: 'ai-insight',
        component: AiInsightView,
        meta: { title: 'AI Insight', viewKey: 'ai-insight', requiresAuth: true }
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach((to, from, next) => {
    const { state } = useKalaFokus();

    // Sinkronkan state.currentView dengan route yang sedang aktif
    if (to.meta.viewKey) {
        state.currentView = to.meta.viewKey;
    }

    if (to.meta.requiresAuth && !state.isAuthenticated) {
        next({ name: 'auth' });
    } else if (to.meta.requiresGuest && state.isAuthenticated) {
        next({ name: 'dashboard' });
    } else {
        next();
    }
});

export default router;