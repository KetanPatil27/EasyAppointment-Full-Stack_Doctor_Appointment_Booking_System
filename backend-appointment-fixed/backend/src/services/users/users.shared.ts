import type { UsersService } from './users.class'

export const userPath = 'users' as const

export const userMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

export type UserService = UsersService
