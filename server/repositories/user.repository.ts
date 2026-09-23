import type { User } from '@prisma/client'
import { prisma } from '../db/client'

// Data access for users. The only layer that talks to Prisma for the User
// model; services depend on these functions, not on Prisma directly.

export interface CreateUserInput {
  email: string
  passwordHash: string
}

export function createUser(input: CreateUserInput): Promise<User> {
  return prisma.user.create({ data: input })
}

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } })
}

export function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } })
}
