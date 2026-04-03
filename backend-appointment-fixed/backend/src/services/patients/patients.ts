import { PatientsService } from './patients.class'
import hooks from './patients.hooks'
import type { Application } from '../../declarations'

declare module '../../declarations' {
  interface ServiceTypes {
    patients: PatientsService
  }
}

export const patients = (app: Application) => {
  const dbPromise = app.get('mongodbClient')

  app.use('patients', new PatientsService({
    paginate: app.get('paginate'),
    Model: dbPromise.then((db: any) => {
      db.collection('patients').createIndex({ userId: 1 }, { unique: true }).catch(() => {})
      return db.collection('patients')
    })
  }, app), {
    methods: ['find', 'get', 'create', 'patch', 'remove']
  })

  app.service('patients').hooks(hooks)
}
