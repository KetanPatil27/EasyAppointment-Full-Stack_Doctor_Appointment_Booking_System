import type { Application } from '../../declarations'
import { AppointmentsService, getOptions } from './appointment.class'
import hooks from './appointment.hook'

declare module '../../declarations' {
  interface ServiceTypes {
    appointments: AppointmentsService
  }
}

export const appointment = (app: Application) => {
  app.use('appointments', new AppointmentsService(getOptions(app)), {
    methods: ['find', 'get', 'create', 'patch', 'remove']
  })
  app.service('appointments').hooks(hooks)
}
