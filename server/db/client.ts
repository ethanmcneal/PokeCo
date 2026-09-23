import { PrismaClient } from '@prisma/client'

// A single PrismaClient reused across dev hot-reloads to avoid exhausting
// database connections. This module is the only place the client is
// constructed; see specs/02-architecture.md (server layering).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
