export type FeedbackTicketType = 'bug' | 'improvement'
export type FeedbackTicketStatus = 'open' | 'closed'
export type FeedbackImprovementDecision = 'pending' | 'accepted' | 'rejected'
export type FeedbackDeviceClass = 'desktop' | 'mobile' | 'tablet' | 'unknown'

export interface FeedbackAuthor {
  id: number
  displayName: string
  email: string
  isAdmin: boolean
}

export interface FeedbackTicketSummary {
  id: number
  type: FeedbackTicketType
  status: FeedbackTicketStatus
  improvementDecision: FeedbackImprovementDecision | null
  decisionNote: string | null
  decidedAt: string | null
  message: string
  pagePath: string | null
  deviceClass: FeedbackDeviceClass
  osLabel: string | null
  browserLabel: string | null
  hasScreenshot: boolean
  hasConsoleText: boolean
  createdAt: string
  updatedAt: string
  author: FeedbackAuthor
  messageCount: number
}

export interface FeedbackMessage {
  id: number
  body: string
  createdAt: string
  author: FeedbackAuthor
}

export interface FeedbackTicketDetail extends FeedbackTicketSummary {
  userAgent: string | null
  consoleText: string | null
  screenshotUrl: string | null
  messages: FeedbackMessage[]
}

export interface FeedbackAccess {
  isBetaTester: boolean
  isFeedbackAdmin: boolean
}

export interface CreateFeedbackPayload {
  type: FeedbackTicketType
  message: string
  pagePath?: string | null
  userAgent?: string | null
  deviceClass?: FeedbackDeviceClass
  osLabel?: string | null
  browserLabel?: string | null
  consoleText?: string | null
  screenshot?: File | null
}
