import 'dotenv/config'

import { runMigrations } from './db/migrate.js'
import { config } from './config.js'
import { buildServer } from './server.js'
import { logEmailSetup } from './services/email.js'
import { logSmsSetup } from './services/sms.js'

await runMigrations()
const app = await buildServer()
logEmailSetup(app.log)
logSmsSetup(app.log)

await app.listen({
  port: config.port,
  host: '0.0.0.0',
})
