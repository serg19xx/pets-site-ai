import { Icon, addCollection } from '@iconify/vue'
import lucideIcons from '@iconify-json/lucide/icons.json'

export default defineNuxtPlugin((nuxtApp) => {
  addCollection(lucideIcons)
  nuxtApp.vueApp.component('Icon', Icon)
})
