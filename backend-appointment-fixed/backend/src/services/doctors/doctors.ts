import type { Application } from '../../declarations'
import { DoctorsService } from './doctors.class'
import { doctorsPath, doctorsMethods } from './doctors.shared'
import doctorsHooks from './doctors.hook'

export const getOptions = (app: Application) => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then((db: any) => {
      db.collection('doctors').createIndex({ userId: 1 }, { unique: true }).catch(() => {})
      return db.collection('doctors')
    })
  }
}

export const doctors = (app: Application) => {
  app.use(doctorsPath, new DoctorsService(getOptions(app)), {
    methods: doctorsMethods
  })
  app.service(doctorsPath).hooks(doctorsHooks)
}
