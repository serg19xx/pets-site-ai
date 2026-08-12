export interface PetMedicalPhoto {
  id: number
  url: string
  sortOrder: number
  createdAt: string
}

export interface PetMedicalRecord {
  id: number
  visitedOn: string
  clinicName: string | null
  doctorName: string | null
  procedureLabel: string
  notes: string | null
  photos: PetMedicalPhoto[]
  createdAt: string
  updatedAt: string
}

export interface UpsertPetMedicalRecordInput {
  visitedOn: string
  clinicName?: string | null
  doctorName?: string | null
  procedureLabel: string
  notes?: string | null
}

export type MedicalRequestStatus = 'pending' | 'approved' | 'declined'

export type MedicalShareViewerStatus =
  | 'none'
  | 'pending'
  | 'declined'
  | 'approved'
  | 'expired'

export interface OwnerMedicalRequest {
  id: number
  petId: number
  petName: string
  requesterUserId: number
  requesterLabel: string
  status: MedicalRequestStatus
  createdAt: string
  decidedAt: string | null
  shareExpiresAt: string | null
}

export interface RequesterMedicalStatus {
  status: MedicalShareViewerStatus
  expiresAt: string | null
  sharePath: string | null
}

export interface MedicalShareView {
  pet: { id: number; name: string }
  expiresAt: string
  records: PetMedicalRecord[]
}
