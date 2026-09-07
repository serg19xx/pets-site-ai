import { LEARN_GUIDES } from '../../data/learn-guides'

const STATIC_PATHS = ['/feed', '/gallery', '/learn', '/learn/legal', '/consultations', '/groups', '/contact', '/faq'] as const
const FR_PREFIX = '/fr'

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function urlEntry(base: string, path: string, changefreq: string, priority: string): string {
  const loc = `${base}${path === '' ? '/' : path}`
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const base = String(config.public.siteUrl ?? 'http://localhost:3000').replace(/\/$/, '')
  const apiInternal = String(config.apiInternal ?? 'http://127.0.0.1:8080').replace(/\/$/, '')

  const petIds: number[] = []
  try {
    const res = await $fetch<{ pets: { id: number }[] }>(
      `${apiInternal}/api/gallery/pets?limit=500&offset=0`,
    )
    for (const pet of res.pets) {
      if (Number.isInteger(pet.id) && pet.id > 0) {
        petIds.push(pet.id)
      }
    }
  } catch {
    /* gallery unavailable at build/prerender time */
  }

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]

  for (const path of STATIC_PATHS) {
    const isHome = path === '/feed'
    lines.push(urlEntry(base, path, isHome ? 'daily' : 'weekly', isHome ? '1.0' : '0.6'))
    const frPath = `${FR_PREFIX}${path}`
    lines.push(urlEntry(base, frPath, isHome ? 'daily' : 'weekly', isHome ? '0.9' : '0.5'))
  }

  for (const id of petIds) {
    lines.push(urlEntry(base, `/gallery/${id}`, 'weekly', '0.8'))
    lines.push(urlEntry(base, `${FR_PREFIX}/gallery/${id}`, 'weekly', '0.7'))
  }

  for (const guide of LEARN_GUIDES) {
    lines.push(urlEntry(base, `/learn/${guide.slug}`, 'monthly', '0.5'))
    lines.push(urlEntry(base, `${FR_PREFIX}/learn/${guide.slug}`, 'monthly', '0.4'))
  }

  lines.push('</urlset>')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return lines.join('\n')
})
