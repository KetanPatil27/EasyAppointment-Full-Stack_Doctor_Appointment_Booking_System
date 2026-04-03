import { Forbidden } from '@feathersjs/errors'

export class InactiveAccountError extends Forbidden {
  constructor(status?: string) {
    if (status === 'pending') {
      super('Your account is pending admin approval. Please wait until the admin approves your account.')
    } else if (status === 'suspended') {
      super('Your account has been suspended. Please contact support.')
    } else {
      super('Your account is not active. Please contact support.')
    }
  }
}
