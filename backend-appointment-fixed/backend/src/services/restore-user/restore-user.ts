import { authenticate } from '@feathersjs/authentication'
import type { Application } from '../../declarations'
import { RestoreUserService } from './restore-user.class'

declare module '../../declarations' {
  interface ServiceTypes {
    'restore-user': RestoreUserService
  }
}

export const restoreUser = (app: Application) => {
  app.use('restore-user', new RestoreUserService(app) as any)
  app.service('restore-user').hooks({
    before: {
      create: [authenticate('jwt') as any]
    }
  })
}
