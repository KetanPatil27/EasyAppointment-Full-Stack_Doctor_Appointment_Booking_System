import type { Application } from '../../declarations'
import { PasswordResetsService } from './password-reset.class'
import hooks from './password-reset.hook'

declare module '../../declarations' {
  interface ServiceTypes {
    'password-resets': PasswordResetsService
  }
}

export const passwordResets = (app: Application) => {
  const dbPromise = app.get('mongodbClient')

  app.use('password-resets', new PasswordResetsService({
    paginate: app.get('paginate'),
    Model: dbPromise.then((db: any) => {
      db.collection('password_resets').createIndex(
        { expiresAt: 1 }, { expireAfterSeconds: 0 }
      ).catch(() => {})
      return db.collection('password_resets')
    })
  }), {
    methods: ['find', 'get', 'create', 'patch', 'remove']
  })

  app.service('password-resets').hooks(hooks)
}
