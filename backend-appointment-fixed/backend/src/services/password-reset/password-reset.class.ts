import { MongoDBService } from '@feathersjs/mongodb'
import type { Params } from '@feathersjs/feathers'

export class PasswordResetsService<
  ServiceParams extends Params = Params
> extends MongoDBService<any, any, ServiceParams> {}
