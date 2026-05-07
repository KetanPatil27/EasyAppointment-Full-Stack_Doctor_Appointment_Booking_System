require('dotenv').config()
import { feathers } from '@feathersjs/feathers'
import express, {
  rest,
  json,
  urlencoded,
  cors,
  serveStatic,
  notFound,
  errorHandler
} from '@feathersjs/express'
import configuration from '@feathersjs/configuration'
import socketio from '@feathersjs/socketio'
import cookieParser from 'cookie-parser'

import type { Application } from './declarations'
import { configurationValidator } from './configuration'
import { logger } from './logger'
import { logError } from './hooks/log-error'
import { mongodb } from './mongodb'
import { authentication } from './authentication'
import { services } from './services/index'
import { channels } from './channels'
import { globalLimiter, authLimiter, limitPostOnly } from './middleware/rate-limit'
import { sanitizeBody } from './middleware/sanitize-body'
import { sanitizeStrings } from './hooks/sanitize-strings'
import { resolveAllowedOrigins, buildCorsOptions, buildOriginValidator } from './middleware/cors-config'
import { setAuthCookieOnLogin, clearAuthCookieOnLogout } from './middleware/auth-cookie'

const app: Application = express(feathers())

app.configure(configuration(configurationValidator))

// Trust the first proxy in front of us (e.g. Nginx, Render, Railway, Cloudflare).
// Required for rate limiting to see the real client IP via X-Forwarded-For instead
// of the proxy's IP. Skipped in development where there is no proxy.
if (process.env.NODE_ENV === 'production') {
  // Cast: Feathers' app.set is typed against the config schema, but the
  // underlying Express setting "trust proxy" is still honored at runtime.
  ;(app as any).set('trust proxy', 1)
}

// CORS — origins resolved from ALLOWED_ORIGINS env var (with default.json
// fallback for dev). See middleware/cors-config.ts for the validation logic.
const allowedOrigins = resolveAllowedOrigins(app.get('origins'))
logger.info(`CORS allowed origins: ${JSON.stringify(allowedOrigins)}`)

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  logger.error('No CORS origins configured for production. Set ALLOWED_ORIGINS env var.')
  process.exit(1)
}

app.use(cors(buildCorsOptions(allowedOrigins)))

app.use(cookieParser())

// Global rate limit: 100 requests / 15 min / IP. Runs before body parsing
// so blocked requests don't waste cycles parsing JSON.
app.use(globalLimiter)

app.use(json({ limit: '10mb' }))
app.use(urlencoded({ extended: true, limit: '10mb' }))

// NoSQL operator injection protection — must run AFTER body parsing.
// Strips `$`-prefixed and dotted keys from req.body / req.params so a client
// can't smuggle Mongo operators like `{ "$ne": null }` into the database.
app.use(sanitizeBody)

app.use('/', serveStatic(app.get('public')))

// Strict limiter on auth-sensitive endpoints — 5 failed attempts / 15 min / IP.
// Only counts failures (skipSuccessfulRequests: true), so legitimate users
// aren't punished for occasional typos. POST-only on /users so admin user
// listing is not throttled.
app.use('/authentication', authLimiter)
app.use('/users', limitPostOnly(authLimiter))
app.use('/forgot-password', limitPostOnly(authLimiter))
app.use('/reset-password', limitPostOnly(authLimiter))

// httpOnly cookie auth — wraps res.json on /authentication so the JWT issued
// by the AuthenticationService also lands in a Set-Cookie header. Must be
// registered BEFORE `app.configure(authentication)` so the wrapper exists
// when the service writes its response. See middleware/auth-cookie.ts for
// the full explanation of why this is a middleware rather than a hook.
app.use('/authentication', setAuthCookieOnLogin)
app.use('/authentication', clearAuthCookieOnLogout)

app.configure(rest())
app.configure(
  socketio({
    cors: {
      // Same allowlist + validator function used by Express CORS.
      // Socket.IO accepts the same `origin` callback signature as the cors package.
      origin: buildOriginValidator(allowedOrigins) as any,
      methods: ['GET', 'POST'],
      credentials: true
    }
  })
)

// Configure MongoDB - stores the client promise on the app
app.configure(mongodb)

// Register services synchronously using the DB promise
// (MongoDBService accepts a Promise<Collection> for Model)
app.configure(services as any)

// Register authentication AFTER services so users service exists when setup() runs
app.configure(authentication)
app.configure(channels)

app.use(notFound())
app.use(errorHandler({ logger }))

app.hooks({
  around: { all: [logError] },
  // Global XSS sanitization on every create/patch/update across every service.
  // Strips HTML tags from user-supplied string fields so stored data is safe
  // to render anywhere later.
  before: {
    create: [sanitizeStrings],
    patch: [sanitizeStrings],
    update: [sanitizeStrings]
  },
  after: {},
  error: {}
})
app.hooks({ setup: [], teardown: [] })

export { app }
