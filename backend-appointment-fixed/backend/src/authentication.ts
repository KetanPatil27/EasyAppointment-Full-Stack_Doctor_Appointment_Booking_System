import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'
import { LocalStrategy } from '@feathersjs/authentication-local'
import { Forbidden } from '@feathersjs/errors'
import type { Application } from './declarations'
import { InactiveAccountError } from './errors/InactiveAccountError'

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

    // Role validation: if the client sends a role, it must match the user's DB role
    // Admins are exempt — they can log in from any panel
    if (data.role && result.user.role !== 'admin' && result.user.role !== data.role) {
      throw new Forbidden('Incorrect role selected for this account.')
    }

    return result
  }
}

class CustomJWTStrategy extends JWTStrategy {
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
