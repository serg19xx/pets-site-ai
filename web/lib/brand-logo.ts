export type BrandLogoVariant = 'wide' | 'circle'

export const BRAND_LOGO_PATHS: Record<BrandLogoVariant, string> = {
  wide: '/brand/logo-wide.webp',
  circle: '/brand/logo-circle.webp',
}

export const BRAND_LOGO_VARIANTS: BrandLogoVariant[] = ['wide', 'circle']

export function isBrandLogoVariant(value: unknown): value is BrandLogoVariant {
  return value === 'wide' || value === 'circle'
}

export function nextBrandLogoVariant(current: BrandLogoVariant): BrandLogoVariant {
  const index = BRAND_LOGO_VARIANTS.indexOf(current)
  return BRAND_LOGO_VARIANTS[(index + 1) % BRAND_LOGO_VARIANTS.length]!
}
