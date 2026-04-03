import { Type, getValidator } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'
import { dataValidator } from './validators'

// Use a flat schema without Type.Intersect to avoid TS2589 deep instantiation error
export const configurationSchema = Type.Object({
  host: Type.String(),
  port: Type.Number(),
  public: Type.String(),
  origins: Type.Array(Type.String()),
  mongodb: Type.String(),
  paginate: Type.Object({
    default: Type.Number(),
    max: Type.Number()
  }),
  authentication: Type.Any()
})

export type ApplicationConfiguration = Static<typeof configurationSchema>

export const configurationValidator = getValidator(configurationSchema, dataValidator)
