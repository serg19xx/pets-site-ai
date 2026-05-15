import { createRouter, createWebHistory } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import AuthView from '@/views/AuthView.vue'
import GalleryView from '@/views/GalleryView.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'
import ProfileView from '@/views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppShell,
      children: [
        {
          path: '',
          name: 'gallery',
          component: GalleryView,
        },
        {
          path: 'auth',
          name: 'auth',
          component: AuthView,
        },
        {
          path: 'feed',
          name: 'feed',
          component: PlaceholderView,
          props: { title: 'Feed', description: 'Posts from the community will appear here.' },
        },
        {
          path: 'learn',
          name: 'learn',
          component: PlaceholderView,
          props: { title: 'Learn', description: 'Educational materials will appear here.' },
        },
        {
          path: 'profile',
          name: 'profile',
          component: ProfileView,
        },
      ],
    },
  ],
})

export default router
