import type { PublicMember } from '~/types/public-member'

export interface MarketplaceListingMedia {
  id: number
  kind: 'image' | 'video'
  url: string
  sortOrder: number
}

export interface MarketplaceListing {
  id: number
  type: 'sell' | 'buy' | 'exchange' | 'service'
  title: string
  description: string
  priceAmount: number | null
  priceCurrency: string
  city: string | null
  contactPhone: string | null
  contactMethod: string | null
  status: 'draft' | 'active' | 'archived' | 'closed'
  createdAt: string
  updatedAt: string
  author: PublicMember
  media: MarketplaceListingMedia[]
  inquirySettings?: {
    inquiryNotifyEmail: boolean
    inquiryNotifySms: boolean
    inquirySmsPhone: string | null
  }
}

export interface CreateMarketplaceListingPayload {
  type: MarketplaceListing['type']
  title: string
  description: string
  priceAmount?: number | null
  priceCurrency?: string
  city?: string | null
  contactPhone?: string | null
  contactMethod?: string | null
  status?: MarketplaceListing['status']
}

export interface UpdateMarketplaceListingPayload {
  type?: MarketplaceListing['type']
  title?: string
  description?: string
  priceAmount?: number | null
  priceCurrency?: string
  city?: string | null
  contactPhone?: string | null
  contactMethod?: string | null
  status?: MarketplaceListing['status']
  inquiryNotifyEmail?: boolean
  inquiryNotifySms?: boolean
  inquirySmsPhone?: string | null
}

export const MARKETPLACE_MAX_PHOTOS = 5

/** Form payload: create fields + optional inquiry notify settings (edit). */
export type MarketplaceListingFormPayload = CreateMarketplaceListingPayload &
  Pick<
    UpdateMarketplaceListingPayload,
    'inquiryNotifyEmail' | 'inquiryNotifySms' | 'inquirySmsPhone'
  >

export interface ListingFormSubmit {
  payload: MarketplaceListingFormPayload
  newFiles: File[]
  removedMediaIds: number[]
}
