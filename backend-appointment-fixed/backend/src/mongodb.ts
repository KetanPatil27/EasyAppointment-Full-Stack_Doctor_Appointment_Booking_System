import { MongoClient } from 'mongodb'
import type { Application } from './declarations'

export const mongodb = (app: Application) => {
  const connection = process.env.MONGODB_URI || app.get('mongodb')
  const database = new URL(connection).pathname.substring(1) || 'easyappointment'

  const mongoClient = new MongoClient(connection)

  // Connect and store a promise that resolves to the db instance
  // MongoDBService accepts Model as a Promise<Collection>, so this works
  const dbPromise = mongoClient.connect().then(() => mongoClient.db(database))

  app.set('mongodbClient', dbPromise)
}
