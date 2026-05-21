import {
  BRAND_LOGO_PATHS,
  isBrandLogoVariant,
  nextBrandLogoVariant,
  type BrandLogoVariant,
} from '~/lib/brand-logo'

const BRAND_LOGO_COOKIE = 'pets_brand_logo'

function resolveDefaultVariant(): BrandLogoVariant {
  const config = useRuntimeConfig()
  const fromEnv = config.public.brandLogo
  if (isBrandLogoVariant(fromEnv)) {
    return fromEnv
  }
  return 'wide'
}

export function useBrandLogo() {
  const route = useRoute()
  const cookie = useCookie<BrandLogoVariant | null>(BRAND_LOGO_COOKIE, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const preferred = useState<BrandLogoVariant>('brand-logo-preferred', () => {
    if (isBrandLogoVariant(cookie.value)) {
      return cookie.value
    }
    return resolveDefaultVariant()
  })

  const variant = computed<BrandLogoVariant>(() => {
    const fromQuery = route.query.brand
    if (isBrandLogoVariant(fromQuery)) {
      return fromQuery
    }
    return preferred.value
  })

  watch(
    () => route.query.brand,
    (value) => {
      if (isBrandLogoVariant(value)) {
        preferred.value = value
        cookie.value = value
      }
    },
    { immediate: true },
  )

  function toggleVariant() {
    const next = nextBrandLogoVariant(variant.value)
    preferred.value = next
    cookie.value = next

    if ('brand' in route.query) {
      const query = { ...route.query }
      delete query.brand
      navigateTo({ path: route.path, query }, { replace: true })
    }
  }

  const src = computed(() => BRAND_LOGO_PATHS[variant.value])

  return { variant, src, toggleVariant }
}
