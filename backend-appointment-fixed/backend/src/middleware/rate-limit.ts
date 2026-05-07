import rateLimit from 'express-rate-limit'
import type { Request, Response, NextFunction } from 'express'

const isProd = process.env.NODE_ENV === 'production'

/**
 * Global rate limiter — applied to every request.
 * - Production: 100 requests / 15 min / IP (per code review Section 1.1).
 * - Development: 2000 / 15 min / IP. The admin dashboard fires 5+ calls per
 *   page view; the strict prod limit is impractical when clicking around
 *   during local testing.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: isProd ? 100 : 2000,
  standardHeaders: 'draft-7', // RateLimit-* response headers
  legacyHeaders: false,
  message: {
    name: 'TooManyRequests',
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
    code: 429
  }
})

/**
 * Strict limiter for authentication endpoints (login, register, forgot/reset password).
 * Per the code review (Section 1.1): 5 failed attempts per 15 minutes.
 * `skipSuccessfulRequests: true` means valid logins do NOT count toward the limit —
 * only failed login attempts. This prevents brute-force credential stuffing while
 * not punishing legitimate users for typos.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    name: 'TooManyRequests',
    message: 'Too many failed authentication attempts. Account temporarily locked. Try again in 15 minutes.',
    code: 429
  }
})

/**
 * Wraps a limiter so it only fires on POST requests.
 * Used on paths like `/users` where GET (list users) should not be brute-force
 * limited but POST (registration) should be.
 */
export const limitPostOnly = (limiter: ReturnType<typeof rateLimit>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST') return limiter(req, res, next)
    next()
  }
}
