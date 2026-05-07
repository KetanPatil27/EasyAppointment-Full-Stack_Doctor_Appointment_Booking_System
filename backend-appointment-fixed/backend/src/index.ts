import { app } from './app'
import { logger } from './logger'

// --- Required environment variable validation (fail-fast) ---
// The server must NEVER start with missing or known-leaked secrets.
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'MONGODB_URI', 'MAIL_USER', 'MAIL_PASS'] as const

const KNOWN_LEAKED_SECRETS = new Set<string>([
  'IeHWgKmbax6WrUJUO68C0LaqxN25Wy9G' // original committed secret — must be rotated
])

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
if (missing.length > 0) {
  logger.error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      `Refer to .env.example. The server will not start.`
  )
  process.exit(1)
}

const jwtSecret = process.env.JWT_SECRET as string
if (jwtSecret.length < 32) {
  logger.error('JWT_SECRET must be at least 32 characters. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  process.exit(1)
}
if (KNOWN_LEAKED_SECRETS.has(jwtSecret)) {
  logger.error('JWT_SECRET matches a known-leaked value. Rotate it immediately.')
  process.exit(1)
}

process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection %O', reason))

const port = app.get('port')
const host = app.get('host')

app
  .listen(port)
  .then(() => {
    logger.info(`Feathers app listening on http://${host}:${port}`)
  })
  .catch((err) => {
    logger.error('Failed to start server: %O', err)
    process.exit(1)
  })
