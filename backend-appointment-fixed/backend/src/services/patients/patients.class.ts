import { MongoDBService } from '@feathersjs/mongodb'
import type { Application } from '../../declarations'

export class PatientsService extends MongoDBService {
  constructor(options: any, _app?: Application) {
    super(options)
  }
}
