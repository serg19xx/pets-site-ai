import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'

export interface PetLikeStatus {
  liked: boolean
  count: number
}

async function assertPetExists(petId: number): Promise<void> {
  const r = await pool.query('SELECT id FROM pets WHERE id = $1', [petId])
  if (!r.rows[0]) {
    throw new AppError(404, 'Pet not found', 'NOT_FOUND')
  }
}

export async function getPetLikeStatus(
  petId: number,
  userId?: number,
): Promise<PetLikeStatus> {
  await assertPetExists(petId)

  const countR = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM pet_likes WHERE pet_id = $1',
    [petId],
  )
  const count = Number(countR.rows[0]?.count ?? 0)

  if (userId === undefined) {
    return { liked: false, count }
  }

  const likedR = await pool.query(
    'SELECT 1 FROM pet_likes WHERE user_id = $1 AND pet_id = $2',
    [userId, petId],
  )
  return { liked: likedR.rows.length > 0, count }
}

export async function togglePetLike(petId: number, userId: number): Promise<PetLikeStatus> {
  await assertPetExists(petId)

  const existing = await pool.query(
    'SELECT 1 FROM pet_likes WHERE user_id = $1 AND pet_id = $2',
    [userId, petId],
  )

  if (existing.rows.length > 0) {
    await pool.query('DELETE FROM pet_likes WHERE user_id = $1 AND pet_id = $2', [
      userId,
      petId,
    ])
  } else {
    await pool.query(
      'INSERT INTO pet_likes (user_id, pet_id) VALUES ($1, $2)',
      [userId, petId],
    )
  }

  return getPetLikeStatus(petId, userId)
}
