import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { pool } from './pool.js'

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../../migrations')

export async function runMigrations(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    const applied = await client.query<{ name: string }>('SELECT name FROM schema_migrations')
    const done = new Set(applied.rows.map((row) => row.name))

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of files) {
      if (done.has(file)) {
        continue
      }
      const sql = await readFile(join(migrationsDir, file), 'utf8')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
