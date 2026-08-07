import { pool } from '../db/pool.js'
import { adminUsersExclusion } from '../lib/admin.js'
import { AppError } from '../lib/errors.js'
import { buildPublicUploadUrl } from '../lib/uploads.js'
import { createNewFriendDraft, createFriendReplicaExchange } from './pet-ai-drafts.js'
import { PET_EVENT_TYPES, recordPetEvent } from './pet-events.js'
import { completePetGoal, PET_GOAL_TYPES } from './pet-goals.js'
import { PET_MEMORY_KINDS, recordPetMemory } from './pet-memories.js'
import { getPetById } from './pets.js'

/**
 * Pet↔pet friendships (Pet World).
 * For owner entertainment only — no owner social graph, no mutual human obligations.
 * Owners may follow pet activity and take pet recommendations; that is separate from
 * owner↔owner like/follow (future feature).
 * Pets only socialize within the same species — they do not “speak” other kinds.
 * Same-owner pets never become friends (no household “friendship” theater).
 * Semi-auto: backend suggests candidates; owner of from_pet approves.
 */

const SUGGESTION_BATCH = 3

export interface PetFriendSummary {
  id: number
  name: string
  avatarUrl: string | null
  species: { slug: string; label: string }
}

export interface PetFriendExchangeLine {
  speakerPetId: number
  speakerName: string
  turn: number
  body: string
  bodyFr: string
  createdAt: string
}

export interface PetFriendExchange {
  friend: PetFriendSummary
  lines: PetFriendExchangeLine[]
}

export interface PetFriendshipSuggestion {
  id: number
  fromPetId: number
  toPetId: number
  status: string
  createdAt: string
  candidate: PetFriendSummary
}

type FriendRow = {
  id: string
  name: string
  avatar_path: string | null
  species_slug: string
  species_label: string
}

type PetBriefRow = {
  id: string
  name: string
  user_id: string
  species_id: string
  species_label: string
  virtual_life_enabled: boolean
}

type SuggestionRow = {
  id: string
  from_pet_id: string
  to_pet_id: string
  status: string
  created_at: Date
  candidate_id: string
  candidate_name: string
  candidate_avatar_path: string | null
  candidate_species_slug: string
  candidate_species_label: string
}

function mapFriendRow(row: FriendRow): PetFriendSummary {
  return {
    id: Number(row.id),
    name: row.name,
    avatarUrl: row.avatar_path ? buildPublicUploadUrl(row.avatar_path) : null,
    species: { slug: row.species_slug, label: row.species_label },
  }
}

function mapSuggestionRow(row: SuggestionRow): PetFriendshipSuggestion {
  return {
    id: Number(row.id),
    fromPetId: Number(row.from_pet_id),
    toPetId: Number(row.to_pet_id),
    status: row.status,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    candidate: {
      id: Number(row.candidate_id),
      name: row.candidate_name,
      avatarUrl: row.candidate_avatar_path
        ? buildPublicUploadUrl(row.candidate_avatar_path)
        : null,
      species: {
        slug: row.candidate_species_slug,
        label: row.candidate_species_label,
      },
    },
  }
}

function canonicalPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a]
}

async function loadPetBrief(petId: number): Promise<PetBriefRow | null> {
  const r = await pool.query<PetBriefRow>(
    `SELECT
       p.id,
       p.name,
       p.user_id,
       p.species_id,
       ps.label AS species_label,
       p.virtual_life_enabled
     FROM pets p
     INNER JOIN pet_species ps ON ps.id = p.species_id
     WHERE p.id = $1`,
    [petId],
  )
  return r.rows[0] ?? null
}

async function applyFriendshipSideEffects(
  petId: number,
  friend: { id: number; name: string; speciesLabel: string },
): Promise<void> {
  await recordPetEvent({
    petId,
    eventType: PET_EVENT_TYPES.NEW_FRIEND,
    payload: {
      friendPetId: friend.id,
      friendName: friend.name,
      friendSpeciesLabel: friend.speciesLabel,
    },
  })
  await recordPetMemory({
    petId,
    kind: PET_MEMORY_KINDS.RELATIONSHIP,
    content: `Met ${friend.name}`,
    importance: 7,
    sourceEventType: PET_EVENT_TYPES.NEW_FRIEND,
  })
  await completePetGoal(petId, PET_GOAL_TYPES.FIND_FRIENDS, {
    friendPetId: friend.id,
  })
  await createNewFriendDraft(petId, {
    id: friend.id,
    name: friend.name,
    speciesLabel: friend.speciesLabel,
  })
}

export async function listPetFriends(petId: number): Promise<PetFriendSummary[]> {
  const r = await pool.query<FriendRow>(
    `SELECT
       f.id,
       f.name,
       cover.path AS avatar_path,
       ps.slug AS species_slug,
       ps.label AS species_label
     FROM pet_friendships pf
     INNER JOIN pets f ON f.id = CASE
       WHEN pf.pet_a_id = $1 THEN pf.pet_b_id
       ELSE pf.pet_a_id
     END
     INNER JOIN pet_species ps ON ps.id = f.species_id
     LEFT JOIN pet_photos cover ON cover.id = f.cover_photo_id
     WHERE pf.pet_a_id = $1 OR pf.pet_b_id = $1
     ORDER BY pf.created_at DESC, f.name ASC`,
    [petId],
  )
  return r.rows.map(mapFriendRow)
}

/**
 * Short hello/reply exchanges for a pet’s friendships (public profile).
 */
export async function listPetFriendExchanges(
  petId: number,
): Promise<PetFriendExchange[]> {
  type LineRow = {
    friend_id: string
    friend_name: string
    friend_avatar_path: string | null
    friend_species_slug: string
    friend_species_label: string
    speaker_pet_id: string
    speaker_name: string
    turn: number
    body: string
    body_fr: string
    created_at: Date
    pair_created: Date
  }

  const r = await pool.query<LineRow>(
    `SELECT
       f.id AS friend_id,
       f.name AS friend_name,
       cover.path AS friend_avatar_path,
       ps.slug AS friend_species_slug,
       ps.label AS friend_species_label,
       m.speaker_pet_id,
       sp.name AS speaker_name,
       m.turn,
       m.body,
       m.body_fr,
       m.created_at,
       pf.created_at AS pair_created
     FROM pet_friendships pf
     INNER JOIN pets f ON f.id = CASE
       WHEN pf.pet_a_id = $1 THEN pf.pet_b_id
       ELSE pf.pet_a_id
     END
     INNER JOIN pet_species ps ON ps.id = f.species_id
     LEFT JOIN pet_photos cover ON cover.id = f.cover_photo_id
     INNER JOIN pet_friend_messages m
       ON m.pet_a_id = pf.pet_a_id AND m.pet_b_id = pf.pet_b_id
     INNER JOIN pets sp ON sp.id = m.speaker_pet_id
     WHERE pf.pet_a_id = $1 OR pf.pet_b_id = $1
     ORDER BY pf.created_at DESC, m.turn ASC`,
    [petId],
  )

  const byFriend = new Map<number, PetFriendExchange>()
  for (const row of r.rows) {
    const friendId = Number(row.friend_id)
    let exchange = byFriend.get(friendId)
    if (!exchange) {
      exchange = {
        friend: {
          id: friendId,
          name: row.friend_name,
          avatarUrl: row.friend_avatar_path
            ? buildPublicUploadUrl(row.friend_avatar_path)
            : null,
          species: {
            slug: row.friend_species_slug,
            label: row.friend_species_label,
          },
        },
        lines: [],
      }
      byFriend.set(friendId, exchange)
    }
    exchange.lines.push({
      speakerPetId: Number(row.speaker_pet_id),
      speakerName: row.speaker_name,
      turn: Number(row.turn),
      body: row.body,
      bodyFr: row.body_fr,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    })
  }

  return [...byFriend.values()]
}

export async function arePetsFriends(petA: number, petB: number): Promise<boolean> {
  if (petA === petB) {
    return false
  }
  const [a, b] = canonicalPair(petA, petB)
  const r = await pool.query(
    'SELECT 1 FROM pet_friendships WHERE pet_a_id = $1 AND pet_b_id = $2',
    [a, b],
  )
  return (r.rowCount ?? 0) > 0
}

/**
 * Owner of fromPetId creates a mutual friendship with toPetId.
 */
export async function createFriendship(
  userId: number,
  fromPetId: number,
  toPetId: number,
): Promise<{ friends: PetFriendSummary[] }> {
  if (fromPetId === toPetId) {
    throw new AppError(400, 'A pet cannot befriend itself', 'VALIDATION_ERROR')
  }

  await getPetById(userId, fromPetId)

  const fromBrief = await loadPetBrief(fromPetId)
  const toBrief = await loadPetBrief(toPetId)
  if (!fromBrief || !toBrief) {
    throw new AppError(404, 'Pet not found', 'NOT_FOUND')
  }

  if (Number(fromBrief.user_id) === Number(toBrief.user_id)) {
    throw new AppError(
      400,
      'Pets from the same owner cannot become friends',
      'SAME_OWNER',
    )
  }

  if (Number(fromBrief.species_id) !== Number(toBrief.species_id)) {
    throw new AppError(
      400,
      'Pets can only make friends with the same species',
      'SPECIES_MISMATCH',
    )
  }

  const [petA, petB] = canonicalPair(fromPetId, toPetId)

  try {
    await pool.query(
      `INSERT INTO pet_friendships (
         pet_a_id, pet_b_id, initiated_by_pet_id, created_by_user_id
       ) VALUES ($1, $2, $3, $4)`,
      [petA, petB, fromPetId, userId],
    )
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: unknown }).code)
        : ''
    if (code === '23505') {
      throw new AppError(409, 'These pets are already friends', 'ALREADY_FRIENDS')
    }
    throw error
  }

  await applyFriendshipSideEffects(fromPetId, {
    id: Number(toBrief.id),
    name: toBrief.name,
    speciesLabel: toBrief.species_label,
  })
  await applyFriendshipSideEffects(toPetId, {
    id: Number(fromBrief.id),
    name: fromBrief.name,
    speciesLabel: fromBrief.species_label,
  })
  await createFriendReplicaExchange({
    fromPetId,
    fromName: fromBrief.name,
    toPetId,
    toName: toBrief.name,
  })

  return { friends: await listPetFriends(fromPetId) }
}

/**
 * Owner of either pet may remove the friendship.
 */
export async function deleteFriendship(
  userId: number,
  petId: number,
  friendPetId: number,
): Promise<void> {
  if (petId === friendPetId) {
    throw new AppError(400, 'Invalid friend pet id', 'VALIDATION_ERROR')
  }

  const owned = await pool.query(
    `SELECT id FROM pets
     WHERE user_id = $1 AND id IN ($2, $3)`,
    [userId, petId, friendPetId],
  )
  if ((owned.rowCount ?? 0) === 0) {
    throw new AppError(403, 'You do not own either pet in this friendship', 'FORBIDDEN')
  }

  const [petA, petB] = canonicalPair(petId, friendPetId)
  const r = await pool.query(
    `DELETE FROM pet_friendships
     WHERE pet_a_id = $1 AND pet_b_id = $2`,
    [petA, petB],
  )
  if ((r.rowCount ?? 0) === 0) {
    throw new AppError(404, 'Friendship not found', 'NOT_FOUND')
  }
}

export async function listPendingFriendshipSuggestions(
  userId: number,
  fromPetId: number,
): Promise<{ suggestions: PetFriendshipSuggestion[] }> {
  await getPetById(userId, fromPetId)

  const r = await pool.query<SuggestionRow>(
    `SELECT
       s.id,
       s.from_pet_id,
       s.to_pet_id,
       s.status,
       s.created_at,
       c.id AS candidate_id,
       c.name AS candidate_name,
       cover.path AS candidate_avatar_path,
       ps.slug AS candidate_species_slug,
       ps.label AS candidate_species_label
     FROM pet_friendship_suggestions s
     INNER JOIN pets c ON c.id = s.to_pet_id
     INNER JOIN pet_species ps ON ps.id = c.species_id
     LEFT JOIN pet_photos cover ON cover.id = c.cover_photo_id
     WHERE s.from_pet_id = $1
       AND s.status = 'pending'
     ORDER BY s.created_at DESC, s.id DESC`,
    [fromPetId],
  )

  return { suggestions: r.rows.map(mapSuggestionRow) }
}

/**
 * Propose up to N same-species, other-owner candidates for an owned pet.
 * Requires virtual life on the acting pet.
 */
export async function generateFriendshipSuggestions(
  userId: number,
  fromPetId: number,
): Promise<{ suggestions: PetFriendshipSuggestion[] }> {
  const fromPet = await getPetById(userId, fromPetId)
  if (!fromPet.virtualLifeEnabled) {
    throw new AppError(
      400,
      'Turn on virtual life to look for friends',
      'VIRTUAL_LIFE_REQUIRED',
    )
  }

  const fromBrief = await loadPetBrief(fromPetId)
  if (!fromBrief) {
    throw new AppError(404, 'Pet not found', 'NOT_FOUND')
  }

  const exclude = adminUsersExclusion('u.email', 5)
  const candidates = await pool.query<{ id: string }>(
    `SELECT c.id
     FROM pets c
     INNER JOIN users u ON u.id = c.user_id
     WHERE c.species_id = $1
       AND c.user_id <> $2
       AND c.id <> $3
       AND c.virtual_life_enabled = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM pet_friendships pf
         WHERE (pf.pet_a_id = LEAST($3::bigint, c.id)
            AND pf.pet_b_id = GREATEST($3::bigint, c.id))
       )
       AND NOT EXISTS (
         SELECT 1 FROM pet_friendship_suggestions s
         WHERE s.status = 'pending'
           AND LEAST(s.from_pet_id, s.to_pet_id) = LEAST($3::bigint, c.id)
           AND GREATEST(s.from_pet_id, s.to_pet_id) = GREATEST($3::bigint, c.id)
       )
       ${exclude.clause}
     ORDER BY random()
     LIMIT $4`,
    [
      Number(fromBrief.species_id),
      Number(fromBrief.user_id),
      fromPetId,
      SUGGESTION_BATCH,
      ...exclude.params,
    ],
  )

  for (const row of candidates.rows) {
    const toPetId = Number(row.id)
    try {
      await pool.query(
        `INSERT INTO pet_friendship_suggestions (from_pet_id, to_pet_id, status)
         VALUES ($1, $2, 'pending')`,
        [fromPetId, toPetId],
      )
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: unknown }).code)
          : ''
      if (code === '23505') {
        continue
      }
      throw error
    }
  }

  return listPendingFriendshipSuggestions(userId, fromPetId)
}

export async function approveFriendshipSuggestion(
  userId: number,
  fromPetId: number,
  suggestionId: number,
): Promise<{ friends: PetFriendSummary[] }> {
  await getPetById(userId, fromPetId)

  const s = await pool.query<{
    id: string
    from_pet_id: string
    to_pet_id: string
    status: string
  }>(
    `SELECT id, from_pet_id, to_pet_id, status
     FROM pet_friendship_suggestions
     WHERE id = $1 AND from_pet_id = $2`,
    [suggestionId, fromPetId],
  )
  const row = s.rows[0]
  if (!row) {
    throw new AppError(404, 'Suggestion not found', 'NOT_FOUND')
  }
  if (row.status !== 'pending') {
    throw new AppError(409, 'Suggestion is no longer pending', 'NOT_PENDING')
  }

  const toPetId = Number(row.to_pet_id)
  const result = await createFriendship(userId, fromPetId, toPetId)

  await pool.query(
    `UPDATE pet_friendship_suggestions
     SET status = 'approved', resolved_at = NOW()
     WHERE id = $1`,
    [suggestionId],
  )

  return result
}

export async function declineFriendshipSuggestion(
  userId: number,
  fromPetId: number,
  suggestionId: number,
): Promise<void> {
  await getPetById(userId, fromPetId)

  const r = await pool.query(
    `UPDATE pet_friendship_suggestions
     SET status = 'declined', resolved_at = NOW()
     WHERE id = $1
       AND from_pet_id = $2
       AND status = 'pending'`,
    [suggestionId, fromPetId],
  )
  if ((r.rowCount ?? 0) === 0) {
    throw new AppError(404, 'Suggestion not found', 'NOT_FOUND')
  }
}
