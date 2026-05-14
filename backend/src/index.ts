import 'dotenv/config'

import { runMigrations } from './db/migrate.js'
import { config } from './config.js'
import { buildServer } from './server.js'

await runMigrations()
const app = await buildServer()

await app.listen({
  port: config.port,
  host: '0.0.0.0',
})
