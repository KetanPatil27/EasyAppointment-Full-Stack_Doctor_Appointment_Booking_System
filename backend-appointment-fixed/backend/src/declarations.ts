import type { HookContext as FeathersHookContext, NextFunction } from '@feathersjs/feathers'
import type { Application as ExpressFeathers } from '@feathersjs/express'
import type { ApplicationConfiguration } from './configuration'

export type { NextFunction }

// Extend Configuration with all known app config keys
export interface Configuration extends ApplicationConfiguration {
  mongodbClient: Promise<any>
  origins: string[]
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServiceTypes {}

export type Application = ExpressFeathers<ServiceTypes, Configuration>

export type HookContext<S = any> = FeathersHookContext<Application, S>
