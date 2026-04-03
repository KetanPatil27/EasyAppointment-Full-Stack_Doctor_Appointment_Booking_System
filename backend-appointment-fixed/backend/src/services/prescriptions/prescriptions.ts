import type { Application } from '../../declarations'
import { PrescriptionsService } from './prescriptions.class'
import hooks from './prescriptions.hook'

declare module '../../declarations' {
  interface ServiceTypes {
    prescriptions: PrescriptionsService
  }
}

export const prescriptions = (app: Application) => {
  const dbPromise = app.get('mongodbClient')

  app.use('prescriptions', new PrescriptionsService({
    paginate: app.get('paginate'),
    Model: dbPromise.then((db: any) => {
      db.collection('prescriptions').createIndex({ patientId: 1 }).catch(() => {})
      db.collection('prescriptions').createIndex({ doctorId: 1 }).catch(() => {})
      return db.collection('prescriptions')
    })
  }), {
    methods: ['find', 'get', 'create', 'patch', 'remove']
  })

  app.service('prescriptions').hooks(hooks)
}
