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
