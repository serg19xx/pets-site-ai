const STATIC_PATHS = ['', '/feed', '/learn'] as const
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
    lines.push(urlEntry(base, path, path === '' ? 'daily' : 'weekly', path === '' ? '1.0' : '0.6'))
    const frPath = path === '' ? FR_PREFIX : `${FR_PREFIX}${path}`
    lines.push(urlEntry(base, frPath, path === '' ? 'daily' : 'weekly', path === '' ? '0.9' : '0.5'))
  }

  for (const id of petIds) {
    lines.push(urlEntry(base, `/animals/${id}`, 'weekly', '0.8'))
    lines.push(urlEntry(base, `${FR_PREFIX}/animals/${id}`, 'weekly', '0.7'))
  }

  lines.push('</urlset>')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return lines.join('\n')
})
