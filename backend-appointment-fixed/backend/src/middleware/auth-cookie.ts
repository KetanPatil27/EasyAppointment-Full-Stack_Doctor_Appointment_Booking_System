import type { Request, Response, NextFunction } from 'express'

/**
 * Cookie name used for the JWT access token.
 * Single source of truth — referenced by both this middleware and the JWT
 * strategy's cookie-parsing logic in src/authentication.ts.
 */
export const AUTH_COOKIE_NAME = 'accessToken'

const isProd = () => process.env.NODE_ENV === 'production'

/**
 * Resolves SameSite from `COOKIE_SAMESITE` env var with sensible defaults:
 *   - dev: 'lax'   (works for localhost across ports)
 *   - prod: 'strict' for same-site deployments, 'none' for cross-site
 *
 * On Render free tier, frontend and backend each get their own
 * `*.onrender.com` subdomain. Because `onrender.com` is on the browser's
 * Public Suffix List, those subdomains are treated as cross-site for
 * cookie purposes — so `SameSite=strict` blocks the auth cookie. Set
 * COOKIE_SAMESITE=none on Render (and any other split-subdomain hosting).
 */
const resolveSameSite = (): 'strict' | 'lax' | 'none' => {
  const raw = process.env.COOKIE_SAMESITE?.toLowerCase()
  if (raw === 'strict' || raw === 'lax' || raw === 'none') return raw
  return isProd() ? 'strict' : 'lax'
}

const cookieOptions = () => {
  const sameSite = resolveSameSite()
  return {
    httpOnly: true,
    // SameSite=none REQUIRES Secure per the spec, regardless of NODE_ENV.
    secure: isProd() || sameSite === 'none',
    sameSite,
    maxAge: 24 * 60 * 60 * 1000, // 1 day — must match jwtOptions.expiresIn
    path: '/'
  }
}

/**
 * Middleware that mounts on `POST /authentication`. It intercepts `res.json`
 * so that when the AuthenticationService writes its response body, we copy
 * the freshly-minted accessToken into an httpOnly cookie *just before* the
 * JSON is flushed to the client.
 *
 * Why a middleware and not a Feathers after-hook?
 *   In Feathers v5 the REST transport intentionally does NOT pass `req` and
 *   `res` through to service hooks (params is restricted to query / headers /
 *   route / provider). So a hook can't call `res.cookie(...)`. A thin Express
 *   middleware sits *outside* Feathers and has full access to the response
 *   object, which is what we need.
 */
export const setAuthCookieOnLogin = (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'POST') return next()

  const originalJson = res.json.bind(res)
  res.json = (body: any) => {
    try {
      if (body && typeof body === 'object' && body.accessToken && !res.headersSent) {
        res.cookie(AUTH_COOKIE_NAME, body.accessToken, cookieOptions())
      }
    } catch {
      // never let a cookie-write error block the response
    }
    return originalJson(body)
  }
  next()
}

/**
 * Middleware that mounts on `DELETE /authentication`. Clears the cookie
 * after the logout request goes through, so the browser stops sending it.
 */
export const clearAuthCookieOnLogout = (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'DELETE') return next()

  const originalJson = res.json.bind(res)
  res.json = (body: any) => {
    try {
      if (!res.headersSent) {
        res.clearCookie(AUTH_COOKIE_NAME, { path: '/' })
      }
    } catch {
      // never let a cookie-clear error block the response
    }
    return originalJson(body)
  }
  next()
}
