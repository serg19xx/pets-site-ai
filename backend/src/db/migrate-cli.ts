import 'dotenv/config'

import { runMigrations } from './migrate.js'

try {
  await runMigrations()
  console.log('Migrations finished.')
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
