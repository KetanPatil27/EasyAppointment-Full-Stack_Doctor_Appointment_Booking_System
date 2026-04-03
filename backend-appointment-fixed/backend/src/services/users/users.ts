import type { Application } from '../../declarations'
import { UsersService, getOptions } from './users.class'
import hooks from './users.hook'

declare module '../../declarations' {
  interface ServiceTypes {
    users: UsersService
  }
}

export const users = (app: Application) => {
  const dbPromise = app.get('mongodbClient')

  app.use('users', new UsersService({
    paginate: app.get('paginate'),
    Model: dbPromise.then((db: any) => {
      db.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {})
      return db.collection('users')
    })
  }), {
    methods: ['find', 'get', 'create', 'patch', 'remove']
  })

  app.service('users').hooks(hooks)
}
