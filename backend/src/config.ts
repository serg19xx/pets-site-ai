import 'dotenv/config'

function readEnv(name: string): string | undefined {
  const value = process.env[name]
  return value === '' ? undefined : value
}

function requireEnv(name: string): string {
  const value = readEnv(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const config = {
  port: Number(readEnv('PORT') ?? '8080'),
  databaseUrl: requireEnv('DATABASE_URL'),
}
