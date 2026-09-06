import { Icon as IconifyIcon, addCollection } from '@iconify/vue/offline'
import lucideIcons from '@iconify-json/lucide/icons.json'
import { defineComponent, h, onMounted, ref } from 'vue'

/**
 * Iconify's Vue SVG renderer uses innerHTML + (for some icons) non-deterministic
 * replaceIDs(). That breaks Nuxt SSR hydration ("Hydration completed but contains
 * mismatches"). Render a same-size placeholder until mount so server HTML and the
 * first client VTree match; swap in the real SVG after hydration.
 */
export default defineNuxtPlugin((nuxtApp) => {
  addCollection(lucideIcons)

  const Icon = defineComponent({
    name: 'Icon',
    inheritAttrs: false,
    props: {
      icon: {
        type: [String, Object],
        required: true,
      },
    },
    setup(props, { attrs }) {
      const isMounted = ref(false)
      onMounted(() => {
        isMounted.value = true
      })

      return () => {
        if (!isMounted.value) {
          // Keep markup identical on server and during client hydrate.
          // Avoid inline style objects (property order can mismatch SSR vs client).
          return h('span', {
            class: attrs.class,
            'aria-hidden': 'true',
          })
        }

        return h(IconifyIcon, { ...attrs, icon: props.icon })
      }
    },
  })

  nuxtApp.vueApp.component('Icon', Icon)
})
