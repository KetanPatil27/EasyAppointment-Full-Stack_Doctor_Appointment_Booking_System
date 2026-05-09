import { authenticate } from '@feathersjs/authentication'
import { Forbidden } from '@feathersjs/errors'
import type { Application, HookContext } from '../../declarations'
import { AuditLogsService, getOptions } from './audit-logs.class'

declare module '../../declarations' {
  interface ServiceTypes {
    'audit-logs': AuditLogsService
  }
}

const adminOnly = async (context: HookContext) => {
  if (!context.params.provider) return context // internal calls allowed
  if (context.params.user?.role !== 'admin') {
    throw new Forbidden('Audit logs are admin-only')
  }
  return context
}

const blockExternalWrite = async (context: HookContext) => {
  if (context.params.provider) {
    throw new Forbidden('Audit logs are append-only — created internally')
  }
  return context
}

export const auditLogs = (app: Application) => {
  app.use('audit-logs', new AuditLogsService(getOptions(app)) as any, {
    methods: ['find', 'get', 'create', 'remove'] as const
  })

  app.service('audit-logs').hooks({
    before: {
      all: [authenticate('jwt') as any],
      find: [adminOnly],
      get: [adminOnly],
      // create is allowed only via internal calls (provider undefined)
      create: [blockExternalWrite],
      // remove is blocked entirely — audit logs are immutable
      remove: [
        async () => {
          throw new Forbidden('Audit logs cannot be deleted')
        }
      ]
    }
  })
}
