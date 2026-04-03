import type { Application } from '../../declarations'
import { HealthDataService } from './health-data.class'
import hooks from './health-data.hook'

declare module '../../declarations' {
  interface ServiceTypes {
    'health-data': HealthDataService
  }
}

export const healthData = (app: Application) => {
  const dbPromise = app.get('mongodbClient')

  app.use('health-data', new HealthDataService({
    paginate: app.get('paginate'),
    Model: dbPromise.then((db: any) => {
      db.collection('health_data').createIndex({ userId: 1 }).catch(() => {})
      return db.collection('health_data')
    })
  }), {
    methods: ['find', 'get', 'create', 'patch', 'remove']
  })

  app.service('health-data').hooks(hooks)
}
