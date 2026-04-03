require('dotenv').config()
import { feathers } from '@feathersjs/feathers'
import express, {
  rest,
  json,
  urlencoded,
  cors,
  serveStatic,
  notFound,
  errorHandler
} from '@feathersjs/express'
import configuration from '@feathersjs/configuration'
import socketio from '@feathersjs/socketio'

import type { Application } from './declarations'
import { configurationValidator } from './configuration'
import { logger } from './logger'
import { logError } from './hooks/log-error'
import { mongodb } from './mongodb'
import { authentication } from './authentication'
import { services } from './services/index'
import { channels } from './channels'

const app: Application = express(feathers())

app.configure(configuration(configurationValidator))

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(json({ limit: '10mb' }))
app.use(urlencoded({ extended: true, limit: '10mb' }))
app.use('/', serveStatic(app.get('public')))

app.configure(rest())
app.configure(
  socketio({
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  })
)

// Configure MongoDB - stores the client promise on the app
app.configure(mongodb)

// Register services synchronously using the DB promise
// (MongoDBService accepts a Promise<Collection> for Model)
app.configure(services as any)

// Register authentication AFTER services so users service exists when setup() runs
app.configure(authentication)
app.configure(channels)

app.use(notFound())
app.use(errorHandler({ logger }))

app.hooks({
  around: { all: [logError] },
  before: {},
  after: {},
  error: {}
})
app.hooks({ setup: [], teardown: [] })

export { app }
