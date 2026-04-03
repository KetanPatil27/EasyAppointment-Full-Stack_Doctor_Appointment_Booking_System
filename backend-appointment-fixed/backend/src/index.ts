import { app } from './app'
import { logger } from './logger'

process.on('unhandledRejection', reason => logger.error('Unhandled Rejection %O', reason))

const port = app.get('port')
const host = app.get('host')

app.listen(port).then(() => {
  logger.info(`Feathers app listening on http://${host}:${port}`)
}).catch(err => {
  logger.error('Failed to start server: %O', err)
  process.exit(1)
})
