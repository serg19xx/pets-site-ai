import { getRequestURL, proxyRequest } from 'h3'

/**
 * Forwards /api/* to the Fastify backend (dev, preview, production).
 * devProxy in nuxt.config only applies to `nuxt dev`.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const base = String(config.apiInternal ?? 'http://127.0.0.1:8080').replace(/\/$/, '')
  const url = getRequestURL(event)
  const target = `${base}${url.pathname}${url.search}`

  return proxyRequest(event, target)
})
