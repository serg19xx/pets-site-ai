import type { FeedbackDeviceClass } from '~/types/feedback'

export interface ClientFeedbackContext {
  pagePath: string
  userAgent: string
  deviceClass: FeedbackDeviceClass
  osLabel: string
  browserLabel: string
}

function detectOs(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'iOS'
  }
  if (/Android/i.test(ua)) {
    return 'Android'
  }
  if (/Windows NT/i.test(ua)) {
    return 'Windows'
  }
  if (/Mac OS X/i.test(ua)) {
    return 'macOS'
  }
  if (/CrOS/i.test(ua)) {
    return 'Chrome OS'
  }
  if (/Linux/i.test(ua)) {
    return 'Linux'
  }
  return 'Unknown OS'
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) {
    return 'Edge'
  }
  if (/OPR\/|Opera/i.test(ua)) {
    return 'Opera'
  }
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    return 'Chrome'
  }
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    return 'Safari'
  }
  if (/Firefox\//i.test(ua)) {
    return 'Firefox'
  }
  return 'Unknown browser'
}

function detectDeviceClass(ua: string): FeedbackDeviceClass {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) {
    return 'tablet'
  }
  if (/Mobi|iPhone|iPod|Android.*Mobile/i.test(ua)) {
    return 'mobile'
  }
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) {
    return 'desktop'
  }
  return 'unknown'
}

/** Snapshot of page + environment for bug reports (client-only). */
export function collectClientFeedbackContext(): ClientFeedbackContext {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const pagePath =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : ''
  return {
    pagePath,
    userAgent,
    deviceClass: detectDeviceClass(userAgent),
    osLabel: detectOs(userAgent),
    browserLabel: detectBrowser(userAgent),
  }
}
