import { MongoDBService } from '@feathersjs/mongodb'
import type { Params } from '@feathersjs/feathers'

export class HealthDataService<
  ServiceParams extends Params = Params
> extends MongoDBService<any, any, ServiceParams> {}
