import { logger } from '../logger'

/**
 * Resolves the list of allowed CORS origins.
 *
 * Source priority:
 *   1. ALLOWED_ORIGINS env var (parsed as JSON array OR comma-separated string)
 *   2. The `origins` array from config/default.json (set by env mapping)
 *   3. Empty list — every cross-origin request is rejected (fail-secure)
 */
export const resolveAllowedOrigins = (configOrigins?: string[]): string[] => {
  const raw = process.env.ALLOWED_ORIGINS
  if (raw) {
    const trimmed = raw.trim()
    // JSON array form: ALLOWED_ORIGINS=["https://a.com","https://b.com"]
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed.map(String)
      } catch (err) {
        logger.warn('ALLOWED_ORIGINS could not be parsed as JSON; falling back to comma-split', {
          error: (err as Error).message
        })
      }
    }
    // Comma-separated form: ALLOWED_ORIGINS=https://a.com,https://b.com
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return Array.isArray(configOrigins) ? configOrigins : []
}

/**
 * Type-narrowed origin checker for the `cors` package and Socket.IO.
 *
 * - Requests with no Origin header (server-to-server, curl, mobile native apps,
 *   same-origin) are allowed through. Browser CORS only kicks in when an Origin
 *   header is sent, so this is safe.
 * - Origins matching the allowlist are allowed.
 * - Anything else is rejected with a clear error logged server-side, so ops
 *   can see exactly which origin was blocked.
 */
export const buildOriginValidator = (allowedOrigins: string[]) => {
  const allowed = new Set(allowedOrigins)
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true)
    if (allowed.has(origin)) return callback(null, true)
    logger.warn(`CORS blocked request from origin: ${origin}`)
    return callback(new Error(`Origin ${origin} is not allowed by CORS policy`))
  }
}

/**
 * Build the CORS options object used for Express middleware.
 * `credentials: true` is intentional — we use httpOnly cookies for auth (Fix 2),
 * so the browser must be permitted to send/receive cookies on cross-origin
 * requests.
 */
export const buildCorsOptions = (allowedOrigins: string[]) => ({
  origin: buildOriginValidator(allowedOrigins),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Cache CORS preflight responses for 10 minutes so the browser doesn't send
  // an OPTIONS request before every single API call. Per Section 1.5 of the
  // code review.
  maxAge: 600
})
