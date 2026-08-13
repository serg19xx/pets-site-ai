/** Soft-launch local partners — manual list, no accounts in the system. */

export interface LocalPartner {
  id: string
  name: string
  /** Public URL (website or Instagram). */
  url: string
  /** Path under /public, e.g. /partners/journet.png */
  logoSrc: string
  /** Greater Montreal / region label for later filtering. */
  region?: string
}

/** How many logos fit in the right aside before “See more…”. */
export const LOCAL_PARTNERS_SIDEBAR_LIMIT = 6

/**
 * Fill when a partner says yes and sends logo + URL.
 * Keep at most a handful live during soft launch.
 */
export const LOCAL_PARTNERS: LocalPartner[] = []
