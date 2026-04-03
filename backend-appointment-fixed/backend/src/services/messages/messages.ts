import type { Application } from '../../declarations'
import { MessagesService } from './messages.class'
import hooks from './messages.hook'

declare module '../../declarations' {
  interface ServiceTypes {
    messages: MessagesService
  }
}

export const messages = (app: Application) => {
  const dbPromise = app.get('mongodbClient')

  app.use('messages', new MessagesService({
    paginate: { default: 100, max: 500 },
    Model: dbPromise.then((db: any) => {
      db.collection('messages').createIndex({ senderId: 1, receiverId: 1 }).catch(() => {})
      db.collection('messages').createIndex({ createdAt: 1 }).catch(() => {})
      return db.collection('messages')
    })
  }), {
    methods: ['find', 'get', 'create', 'patch', 'remove']
  })

  app.service('messages').hooks(hooks)
}
