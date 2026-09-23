import type { CaughtPokemon } from '@prisma/client'
import { prisma } from '../db/client'

// Data access for the collection. Every query is scoped by userId, so there is
// no path that reads or writes another user's rows (specs/03-data-model.md,
// AC-6.3).

export interface CatchInput {
  pokemonId: number
  pokemonName: string
  spriteUrl: string
}

/**
 * Catch is idempotent on (userId, pokemonId): re-catching a species returns the
 * existing row unchanged rather than erroring or duplicating (AC-5.3).
 */
export function catchPokemon(userId: string, input: CatchInput): Promise<CaughtPokemon> {
  return prisma.caughtPokemon.upsert({
    where: { userId_pokemonId: { userId, pokemonId: input.pokemonId } },
    update: {},
    create: { userId, ...input },
  })
}

/** The user's collection, newest first. */
export function listCaughtByUser(userId: string): Promise<CaughtPokemon[]> {
  return prisma.caughtPokemon.findMany({
    where: { userId },
    orderBy: { caughtAt: 'desc' },
  })
}

/**
 * Release is idempotent: removing an entry that isn't present is not an error.
 * Scoped by userId so a user can only ever release their own Pokémon.
 */
export async function releasePokemon(userId: string, pokemonId: number): Promise<void> {
  await prisma.caughtPokemon.deleteMany({ where: { userId, pokemonId } })
}
