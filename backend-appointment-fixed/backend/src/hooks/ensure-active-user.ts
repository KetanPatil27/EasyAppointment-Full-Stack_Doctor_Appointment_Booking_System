import { Forbidden } from '@feathersjs/errors'
import type { HookContext } from '../declarations'

export const ensureActiveUser = async (context: HookContext) => {
  const user = context.params.user
  if (user && user.status !== 'active') {
    throw new Forbidden('Your account is not active')
  }
  return context
}
