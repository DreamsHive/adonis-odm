import { test } from 'node:test'
import assert from 'node:assert'
import OdmSeed from '../../../commands/odm_seed.js'

test('OdmSeed Command - Basic Properties', async (t) => {
  await t.test('should have correct command name and description', () => {
    assert.strictEqual(OdmSeed.commandName, 'odm:seed')
    assert.strictEqual(OdmSeed.description, 'Execute ODM database seeders')
  })

  await t.test('should have correct options', () => {
    assert.strictEqual(OdmSeed.options.allowUnknownFlags, false)
  })

  await t.test('should have help documentation', () => {
    assert.ok(Array.isArray(OdmSeed.help))
    assert.ok(OdmSeed.help.length > 0)
    assert.ok(OdmSeed.help.some((line) => line.includes('odm:seed')))
    assert.ok(OdmSeed.help.some((line) => line.includes('--files')))
    assert.ok(OdmSeed.help.some((line) => line.includes('--interactive')))
    assert.ok(OdmSeed.help.some((line) => line.includes('--connection')))
  })
})

test('OdmSeed Command - Flag Definitions', async (t) => {
  await t.test('should have files flag defined', () => {
    const command = new OdmSeed()
    // Check that the flag properties can be set (they're defined via decorators)
    command.files = ['test.ts']
    assert.ok(Array.isArray(command.files))
  })

  await t.test('should have interactive flag defined', () => {
    const command = new OdmSeed()
    command.interactive = true
    assert.strictEqual(command.interactive, true)
  })

  await t.test('should have connection flag defined', () => {
    const command = new OdmSeed()
    command.connection = 'test'
    assert.strictEqual(command.connection, 'test')
  })
})

test('OdmSeed Command - Helper Methods', async (t) => {
  await t.test('should have getSeederDisplayName method', () => {
    const command = new OdmSeed()

    // Test the private method through reflection
    const getSeederDisplayName = (command as any).getSeederDisplayName.bind(command)

    assert.strictEqual(getSeederDisplayName('./database/seeders/user_seeder.ts'), 'user_seeder')
    assert.strictEqual(
      getSeederDisplayName('./database/seeders/admin/admin_seeder.ts'),
      'admin_seeder'
    )
    assert.strictEqual(getSeederDisplayName('user_seeder.js'), 'user_seeder')
    assert.strictEqual(getSeederDisplayName('complex_seeder.mts'), 'complex_seeder')
  })

  await t.test('should have displayResults method', () => {
    const command = new OdmSeed()

    // Check that the method exists
    assert.ok(typeof (command as any).displayResults === 'function')
  })

  await t.test('should have runSeeders method', () => {
    const command = new OdmSeed()

    // Check that the method exists
    assert.ok(typeof (command as any).runSeeders === 'function')
  })

  await t.test('should have runInteractiveMode method', () => {
    const command = new OdmSeed()

    // Check that the method exists
    assert.ok(typeof (command as any).runInteractiveMode === 'function')
  })
})

test('OdmSeed Command - Class Structure', async (t) => {
  await t.test('should extend BaseCommand', () => {
    const command = new OdmSeed()

    // Check that it has BaseCommand properties/methods
    assert.ok('run' in command)
    assert.ok(typeof command.run === 'function')
  })

  await t.test('should have static properties', () => {
    assert.ok(typeof OdmSeed.commandName === 'string')
    assert.ok(typeof OdmSeed.description === 'string')
    assert.ok(typeof OdmSeed.options === 'object')
    assert.ok(Array.isArray(OdmSeed.help))
  })
})

test('OdmSeed Command - Flag Types', async (t) => {
  await t.test('should accept files as array', () => {
    const command = new OdmSeed()

    // Test that files can be set as array
    command.files = ['file1.ts', 'file2.ts']
    assert.ok(Array.isArray(command.files))
    assert.strictEqual(command.files.length, 2)
  })

  await t.test('should accept interactive as boolean', () => {
    const command = new OdmSeed()

    // Test that interactive can be set as boolean
    command.interactive = true
    assert.strictEqual(command.interactive, true)

    command.interactive = false
    assert.strictEqual(command.interactive, false)
  })

  await t.test('should accept connection as string', () => {
    const command = new OdmSeed()

    // Test that connection can be set as string
    command.connection = 'test-connection'
    assert.strictEqual(command.connection, 'test-connection')
  })
})

test('OdmSeed Command - Documentation Coverage', async (t) => {
  await t.test('should document all command examples', () => {
    const helpText = OdmSeed.help.join(' ')

    // Check that help includes usage examples
    assert.ok(helpText.includes('node ace odm:seed'))
    assert.ok(helpText.includes('--files'))
    assert.ok(helpText.includes('--interactive'))
    assert.ok(helpText.includes('--connection'))
  })

  await t.test('should document flag aliases', () => {
    const helpText = OdmSeed.help.join(' ')

    // Check that help includes flag aliases
    assert.ok(helpText.includes('-f') || helpText.includes('alias'))
    assert.ok(helpText.includes('-i') || helpText.includes('alias'))
    assert.ok(helpText.includes('-c') || helpText.includes('alias'))
  })

  await t.test('should document command behavior', () => {
    const helpText = OdmSeed.help.join(' ')

    // Check that help explains what the command does
    assert.ok(helpText.includes('Execute') || helpText.includes('run'))
    assert.ok(helpText.includes('seeder'))
    assert.ok(helpText.includes('environment'))
  })
})
