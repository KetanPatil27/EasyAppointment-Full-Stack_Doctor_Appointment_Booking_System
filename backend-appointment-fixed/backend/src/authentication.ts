import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'
import { LocalStrategy } from '@feathersjs/authentication-local'
import { Forbidden } from '@feathersjs/errors'
import type { Application } from './declarations'
import { InactiveAccountError } from './errors/InactiveAccountError'
import { AUTH_COOKIE_NAME } from './middleware/auth-cookie'

declare module './declarations' {
  interface ServiceTypes {
    authentication: AuthenticationService
  }
}

class CustomLocalStrategy extends LocalStrategy {
  async authenticate(data: any, params: any) {
    const result: any = await super.authenticate(data, params)

    if (result.user?.status === 'suspended') {
      throw new InactiveAccountError(result.user?.status)
    }

    // Email verification gate (Upgrade 4): every non-admin must verify their
    // email via OTP before being allowed to authenticate. The frontend reads
    // the `code` field on the error to know it should redirect to /verify-email.
    if (result.user?.role !== 'admin' && result.user?.emailVerified !== true) {
      const err: any = new Forbidden(
        'Please verify your email first. Check your inbox for the OTP we sent at sign-up.'
      )
      err.data = { reason: 'email-not-verified', email: result.user.email }
      throw err
    }

    // Role validation: if the client sends a role, it must match the user's DB role
    // Admins are exempt — they can log in from any panel
    if (data.role && result.user.role !== 'admin' && result.user.role !== data.role) {
      throw new Forbidden('Incorrect role selected for this account.')
    }

    return result
  }
}

class CustomJWTStrategy extends JWTStrategy {
  /**
   * Extracts the JWT from either:
   *   1. The standard `Authorization: Bearer <token>` header (default behaviour)
   *   2. An httpOnly cookie named `accessToken` (added for cookie-based auth)
   * Cookie is preferred because it cannot be read by client-side JS (XSS-proof).
   */
  async parse(req: any) {
    const fromHeader = await super.parse(req)
    if (fromHeader) return fromHeader

    const token = req?.cookies?.[AUTH_COOKIE_NAME]
    if (token) {
      return { strategy: this.name, accessToken: token }
    }

    return null
  }

  async getEntity(id: string, params: any) {
    const user = await super.getEntity(id, params)

    if (user.status === 'suspended') {
      throw new InactiveAccountError(user.status)
    }

    return user
  }
}

export const authentication = (app: Application) => {
  const authService = new AuthenticationService(app)

  authService.register('jwt', new CustomJWTStrategy())
  authService.register('local', new CustomLocalStrategy())

  app.use('authentication', authService)
}
