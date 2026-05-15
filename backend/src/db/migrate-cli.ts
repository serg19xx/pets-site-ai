import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
loadEnv({ path: resolve(backendRoot, '.env') })

if (!process.env.DATABASE_URL) {
  console.error(
    [
      'Missing DATABASE_URL.',
      '',
      '  cp backend/.env.example backend/.env',
      '  # edit DATABASE_URL if your Postgres password differs (default: pets_dev_change_me)',
      '',
      'Ensure Postgres is running: docker compose up -d postgres',
    ].join('\n'),
  )
  process.exit(1)
}

try {
  const { runMigrations } = await import('./migrate.js')
  await runMigrations()
  console.log('Migrations finished.')
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
