import { test } from 'node:test'
import assert from 'node:assert'
import { getMetaData, getCommand } from '../commands/index.js'

test('commands export getMetaData function', async () => {
  const metadata = await getMetaData()

  assert.ok(Array.isArray(metadata), 'getMetaData should return an array')
  assert.ok(metadata.length > 0, 'getMetaData should return at least one command')

  const makeOdmModelMeta = metadata.find((cmd) => cmd.commandName === 'make:odm-model')
  assert.ok(makeOdmModelMeta, 'make:odm-model command should be in metadata')
  assert.strictEqual(makeOdmModelMeta.description, 'Make a new ODM model')
})

test('commands export getCommand function', async () => {
  const metadata = await getMetaData()
  const makeOdmModelMeta = metadata.find((cmd) => cmd.commandName === 'make:odm-model')

  assert.ok(makeOdmModelMeta, 'make:odm-model metadata should exist')

  const CommandClass = await getCommand(makeOdmModelMeta)
  assert.ok(CommandClass, 'getCommand should return a command class')
  assert.strictEqual(CommandClass.commandName, 'make:odm-model')
  assert.strictEqual(CommandClass.description, 'Make a new ODM model')
})

test('getCommand returns null for unknown command', async () => {
  const unknownMeta = {
    commandName: 'unknown:command',
    description: 'Unknown command',
    namespace: null,
    aliases: [],
    flags: [],
    args: [],
    options: {},
  }

  const CommandClass = await getCommand(unknownMeta)
  assert.strictEqual(CommandClass, null, 'getCommand should return null for unknown commands')
})
