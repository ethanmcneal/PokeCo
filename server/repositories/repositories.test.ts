import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Exercises the repositories against a throwaway SQLite database. DATABASE_URL
// is pointed at a temp file before the client/repositories are imported, then
// the schema is pushed into it. This proves the schema applies and that queries
// behave (idempotency, user-scoping, cascade) — Phase 1 "done when".

let dbDir: string
let prisma: PrismaClient
let users: typeof import('./user.repository')
let collection: typeof import('./collection.repository')

beforeAll(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'pokeco-test-'))
  process.env.DATABASE_URL = `file:${join(dbDir, 'test.db')}`

  // Create the schema in the throwaway database (no client regeneration).
  execSync('node_modules/.bin/prisma db push --skip-generate --accept-data-loss', {
    stdio: 'ignore',
    env: process.env,
  })

  // Import after DATABASE_URL is set so the singleton connects to the temp db.
  users = await import('./user.repository')
  collection = await import('./collection.repository')
  ;({ prisma } = await import('../db/client'))
})

afterAll(async () => {
  await prisma?.$disconnect()
  rmSync(dbDir, { recursive: true, force: true })
})

beforeEach(async () => {
  await prisma.caughtPokemon.deleteMany()
  await prisma.user.deleteMany()
})

describe('user.repository', () => {
  it('creates a user and finds it by email and id', async () => {
    const created = await users.createUser({ email: 'ash@pallet.town', passwordHash: 'hash' })
    expect(created.id).toBeTruthy()

    expect(await users.findUserByEmail('ash@pallet.town')).toMatchObject({ id: created.id })
    expect(await users.findUserById(created.id)).toMatchObject({ email: 'ash@pallet.town' })
    expect(await users.findUserByEmail('nobody@nowhere')).toBeNull()
  })
})

describe('collection.repository', () => {
  it('catch is idempotent on (userId, pokemonId)', async () => {
    const user = await users.createUser({ email: 'a@b.c', passwordHash: 'h' })
    const input = { pokemonId: 1, pokemonName: 'bulbasaur', spriteUrl: 'x' }

    const first = await collection.catchPokemon(user.id, input)
    const second = await collection.catchPokemon(user.id, input)

    expect(second.id).toBe(first.id)
    expect(await collection.listCaughtByUser(user.id)).toHaveLength(1)
  })

  it('only ever returns the requesting user’s rows', async () => {
    const ash = await users.createUser({ email: 'ash@x', passwordHash: 'h' })
    const gary = await users.createUser({ email: 'gary@x', passwordHash: 'h' })

    await collection.catchPokemon(ash.id, { pokemonId: 25, pokemonName: 'pikachu', spriteUrl: 'x' })
    await collection.catchPokemon(gary.id, {
      pokemonId: 1,
      pokemonName: 'bulbasaur',
      spriteUrl: 'x',
    })

    const ashCollection = await collection.listCaughtByUser(ash.id)
    expect(ashCollection).toHaveLength(1)
    expect(ashCollection[0]!.pokemonId).toBe(25)
  })

  it('release is idempotent and scoped to the user', async () => {
    const user = await users.createUser({ email: 'a@b.c', passwordHash: 'h' })
    await collection.catchPokemon(user.id, {
      pokemonId: 4,
      pokemonName: 'charmander',
      spriteUrl: 'x',
    })

    await collection.releasePokemon(user.id, 4)
    expect(await collection.listCaughtByUser(user.id)).toHaveLength(0)

    // Releasing something not present does not throw.
    await expect(collection.releasePokemon(user.id, 999)).resolves.toBeUndefined()
  })

  it('deleting a user cascades to their collection', async () => {
    const user = await users.createUser({ email: 'a@b.c', passwordHash: 'h' })
    await collection.catchPokemon(user.id, {
      pokemonId: 7,
      pokemonName: 'squirtle',
      spriteUrl: 'x',
    })

    await prisma.user.delete({ where: { id: user.id } })

    expect(await prisma.caughtPokemon.count()).toBe(0)
  })
})
