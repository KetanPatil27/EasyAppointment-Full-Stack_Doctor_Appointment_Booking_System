import type { Application } from '../../declarations'
import { MongoDBService } from '@feathersjs/mongodb'
import type { Params } from '@feathersjs/feathers'

export class UsersService<ServiceParams extends Params = Params> extends MongoDBService<any, any, ServiceParams> {}

export const getOptions = (app: Application) => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('users'))
  }
}
