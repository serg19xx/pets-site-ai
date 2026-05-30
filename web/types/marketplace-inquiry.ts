import type { PublicMember } from '~/types/public-member'

export interface MarketplaceInquiryMessage {
  id: number
  senderUserId: number
  body: string
  createdAt: string
  sender: PublicMember
  isMine: boolean
}

export interface MarketplaceInquirySummary {
  id: number
  listingId: number
  listingTitle: string
  listingStatus: string
  createdAt: string
  updatedAt: string
  customer: PublicMember
  seller: PublicMember
  lastMessage: {
    body: string
    createdAt: string
    senderUserId: number
  } | null
  unreadCount: number
  role: 'customer' | 'seller'
}

export interface MarketplaceInquiryThread {
  inquiry: MarketplaceInquirySummary
  messages: MarketplaceInquiryMessage[]
}
