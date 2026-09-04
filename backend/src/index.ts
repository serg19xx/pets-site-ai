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

/** Periodic idle musings for quiet pets (virtual life on). */
const IDLE_SWEEP_MS = 6 * 60 * 60 * 1000
async function tickIdleMusings() {
  try {
    const { runIdleMusingSweep } = await import('./services/pet-ai-drafts.js')
    const result = await runIdleMusingSweep({ limit: 25 })
    if (result.considered > 0) {
      app.log.info(
        { considered: result.considered, generated: result.generated },
        'idle musing sweep',
      )
    }
  } catch (error) {
    app.log.warn({ err: error }, 'idle musing sweep failed')
  }
}
setTimeout(() => {
  void tickIdleMusings()
}, 60_000)
setInterval(() => {
  void tickIdleMusings()
}, IDLE_SWEEP_MS)
