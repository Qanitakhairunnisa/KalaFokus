// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

import DashboardView from '../views/DashboardView.vue'
import FocusView from '../views/FocusView.vue'
import TasksView from '../views/TasksView.vue'
import BrainfallView from '../views/BrainfallView.vue'
import AiInsightView from '../views/AiInsightView.vue'
import AuthView from '../views/AuthView.vue'

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
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const { authReady, isAuthenticated } = useAuth()

  // Tunggu Firebase selesai memulihkan sesi (kalau tidak, refresh halaman selalu terlempar ke /auth)
  await authReady

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { name: 'auth' }
  }
  if (to.meta.requiresGuest && isAuthenticated.value) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
