import { SlotsService as SlotsServiceClass } from "./slots.class"

export const slotsPath = 'slots' as const
export const slotsMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

export type SlotsService = SlotsServiceClass

declare module '../../declarations' {
  interface ServiceTypes {
    [slotsPath]: SlotsServiceClass
  }
}