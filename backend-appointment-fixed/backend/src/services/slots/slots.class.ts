import { MongoDBService } from '@feathersjs/mongodb'
import type { Params } from '@feathersjs/feathers'
import { Application } from '../../declarations'

export class SlotsService<ServiceParams extends Params = Params> extends MongoDBService<any, any, ServiceParams> {}

export const getOptions = (app: Application) => ({
  paginate: app.get('paginate'),
  Model: app.get('mongodbClient').then(db => db.collection('slots'))
})
