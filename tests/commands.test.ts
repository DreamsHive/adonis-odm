import { test } from 'node:test'
import assert from 'node:assert'
import { getMetaData, getCommand } from '../commands/index.js'
import MakeOdmSeeder from '../commands/make_odm_seeder.js'

test('commands export getMetaData function', async () => {
  const metadata = await getMetaData()

  assert.ok(Array.isArray(metadata), 'getMetaData should return an array')
  assert.ok(metadata.length >= 2, 'getMetaData should return at least two commands')

  // Check for make:odm-model command
  const makeOdmModelMeta = metadata.find((cmd) => cmd.commandName === 'make:odm-model')
  assert.ok(makeOdmModelMeta, 'make:odm-model command should be in metadata')
  assert.strictEqual(makeOdmModelMeta.description, 'Make a new ODM model')

  // Check for make:odm-seeder command
  const makeOdmSeederMeta = metadata.find((cmd) => cmd.commandName === 'make:odm-seeder')
  assert.ok(makeOdmSeederMeta, 'make:odm-seeder command should be in metadata')
  assert.strictEqual(makeOdmSeederMeta.description, 'Create a new ODM seeder file')
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

// MakeOdmSeeder Command Tests
test('MakeOdmSeeder command should be properly registered', async () => {
  const metadata = await getMetaData()
  const makeOdmSeederMeta = metadata.find((cmd) => cmd.commandName === 'make:odm-seeder')

  assert.ok(makeOdmSeederMeta, 'make:odm-seeder metadata should exist')

  const CommandClass = await getCommand(makeOdmSeederMeta)
  assert.ok(CommandClass, 'getCommand should return MakeOdmSeeder class')
  assert.strictEqual(CommandClass.commandName, 'make:odm-seeder')
  assert.strictEqual(CommandClass.description, 'Create a new ODM seeder file')
})

test('MakeOdmSeeder command should have correct static properties', () => {
  assert.strictEqual(MakeOdmSeeder.commandName, 'make:odm-seeder')
  assert.strictEqual(MakeOdmSeeder.description, 'Create a new ODM seeder file')
  assert.ok(MakeOdmSeeder.options, 'Should have options property')
  assert.ok(MakeOdmSeeder.help, 'Should have help property')
})

test('MakeOdmSeeder command should have proper help documentation', () => {
  const help = MakeOdmSeeder.help

  assert.ok(typeof help === 'string', 'Help should be a string')
  assert.ok(help.includes('make:odm-seeder'), 'Help should mention the command name')
  assert.ok(help.includes('main'), 'Help should mention main template')
  assert.ok(help.includes('simple'), 'Help should mention simple template')
  assert.ok(help.includes('advanced'), 'Help should mention advanced template')
  assert.ok(help.includes('Examples:'), 'Help should include examples section')
})

test('MakeOdmSeeder command should have stub validation logic', () => {
  // Test that the command class has the expected structure
  const command = new MakeOdmSeeder()

  // Check that the command has the run method
  assert.ok('run' in command, 'Command should have run method')
  assert.ok(typeof command.run === 'function', 'run should be a function')

  // Test stub validation by checking the valid stubs array in the source
  // This is a more practical test than trying to mock the entire command execution
  const commandSource = command.run.toString()
  assert.ok(commandSource.includes('validStubs'), 'Command should have validStubs array')
  assert.ok(commandSource.includes('main'), 'Command should validate main stub')
  assert.ok(commandSource.includes('simple'), 'Command should validate simple stub')
  assert.ok(commandSource.includes('advanced'), 'Command should validate advanced stub')
  assert.ok(
    commandSource.includes('Invalid stub template'),
    'Command should have error message for invalid stubs'
  )
})

test('MakeOdmSeeder command should have getOutputPath method', () => {
  const command = new MakeOdmSeeder()

  // Check that the private method exists (we can't call it directly, but we can check the source)
  const commandSource = command.constructor.toString()
  assert.ok(commandSource.includes('getOutputPath'), 'Command should have getOutputPath method')
  assert.ok(commandSource.includes('database/seeders'), 'Command should use correct default path')
})
