import { UI_NAV_ICONS } from '~/lib/ui-icons'

export interface AppNavItem {
  id: string
  path: string
  label: string
  icon: string
}

export function isAppNavActive(currentPath: string, itemPath: string, homePath: string): boolean {
  if (itemPath === homePath) {
    return currentPath === itemPath || currentPath === `${itemPath}/`
  }
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`)
}

/** Primary + utility links shared by the left sidebar and the mobile bottom bar. */
export function useAppNav() {
  const { t } = useI18n()
  const localePath = useLocalePath()
  const route = useRoute()

  const homePath = computed(() => localePath('/'))

  const mainItems = computed<AppNavItem[]>(() => [
    {
      id: 'feed',
      path: localePath('/'),
      label: t('nav.feed'),
      icon: UI_NAV_ICONS.feed,
    },
    {
      id: 'animals',
      path: localePath('/animals'),
      label: t('nav.animals'),
      icon: UI_NAV_ICONS.animals,
    },
    {
      id: 'marketplace',
      path: localePath('/marketplace'),
      label: t('nav.marketplace'),
      icon: UI_NAV_ICONS.marketplace,
    },
    {
      id: 'learn',
      path: localePath('/learn'),
      label: t('nav.learn'),
      icon: UI_NAV_ICONS.learn,
    },
  ])

  const utilityItems = computed<AppNavItem[]>(() => [
    {
      id: 'faq',
      path: localePath('/faq'),
      label: t('nav.faq'),
      icon: UI_NAV_ICONS.faq,
    },
    {
      id: 'contact',
      path: localePath('/contact'),
      label: t('nav.contact'),
      icon: UI_NAV_ICONS.contact,
    },
  ])

  function isActive(item: AppNavItem): boolean {
    return isAppNavActive(route.path, item.path, homePath.value)
  }

  /** Always the first four destinations in the mobile bottom bar. */
  const bottomPrimaryItems = computed(() => mainItems.value.slice(0, 4))

  /** Future main links that do not fit in the 4+menu bar. */
  const bottomExtraItems = computed(() => mainItems.value.slice(4))

  return {
    mainItems,
    utilityItems,
    bottomPrimaryItems,
    bottomExtraItems,
    isActive,
  }
}
