import type { Application } from '../../declarations'
import { SlotsService, getOptions } from './slots.class'
import hooks from './slots.hook'
import { slotsPath, slotsMethods } from './slots.shared'

export const slots = (app: Application) => {
  const options = getOptions(app)

  // ✅ Correct app.use signature for TypeScript
  app.use(slotsPath, new SlotsService(options), {
    methods: slotsMethods
  })

  // Add hooks
  app.service(slotsPath).hooks(hooks)
}
