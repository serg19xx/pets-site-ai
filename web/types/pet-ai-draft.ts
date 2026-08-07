export interface PetAiDraft {
  id: number
  petId: number
  templateKey: string
  status: string
  body: string
  bodyFr: string
  sourceEventType: string | null
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface PetAiDraftsListResponse {
  drafts: PetAiDraft[]
  total: number
}
