import { test } from 'node:test'
import assert from 'node:assert'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

test('Seeder Stubs - main stub should have correct structure', async () => {
  const stubPath = join(process.cwd(), 'stubs/make/odm_seeder/main.stub')
  const stubContent = await readFile(stubPath, 'utf-8')

  // Check for required template variables
  assert.ok(stubContent.includes('{{#var seederName'), 'Should define seederName variable')
  assert.ok(stubContent.includes('{{#var seederFileName'), 'Should define seederFileName variable')
  assert.ok(
    stubContent.includes('{{{') && stubContent.includes('exports({'),
    'Should have exports configuration'
  )

  // Check for BaseSeeder import
  assert.ok(
    stubContent.includes("import { BaseSeeder } from 'adonis-odm/seeders'"),
    'Should import BaseSeeder'
  )

  // Check for class structure
  assert.ok(
    stubContent.includes('export default class {{ seederName }} extends BaseSeeder'),
    'Should extend BaseSeeder'
  )
  assert.ok(stubContent.includes('async run(): Promise<void>'), 'Should have async run method')

  // Check for helpful comments and examples
  assert.ok(
    stubContent.includes('Environment restrictions'),
    'Should include environment documentation'
  )
  assert.ok(stubContent.includes('Example:'), 'Should include usage examples')
  assert.ok(stubContent.includes('TODO:'), 'Should include TODO for implementation')
})

test('Seeder Stubs - simple stub should have minimal structure', async () => {
  const stubPath = join(process.cwd(), 'stubs/make/odm_seeder/simple.stub')
  const stubContent = await readFile(stubPath, 'utf-8')

  // Check for required template variables
  assert.ok(stubContent.includes('{{#var seederName'), 'Should define seederName variable')
  assert.ok(stubContent.includes('{{#var seederFileName'), 'Should define seederFileName variable')

  // Check for BaseSeeder import
  assert.ok(
    stubContent.includes("import { BaseSeeder } from 'adonis-odm/seeders'"),
    'Should import BaseSeeder'
  )

  // Check for minimal class structure
  assert.ok(
    stubContent.includes('export default class {{ seederName }} extends BaseSeeder'),
    'Should extend BaseSeeder'
  )
  assert.ok(stubContent.includes('async run(): Promise<void>'), 'Should have async run method')

  // Should be concise
  const lines = stubContent.split('\n').filter((line) => line.trim().length > 0)
  assert.ok(lines.length < 20, 'Simple stub should be concise (less than 20 non-empty lines)')
})

test('Seeder Stubs - advanced stub should have comprehensive features', async () => {
  const stubPath = join(process.cwd(), 'stubs/make/odm_seeder/advanced.stub')
  const stubContent = await readFile(stubPath, 'utf-8')

  // Check for required template variables
  assert.ok(stubContent.includes('{{#var seederName'), 'Should define seederName variable')
  assert.ok(stubContent.includes('{{#var seederFileName'), 'Should define seederFileName variable')

  // Check for BaseSeeder import
  assert.ok(
    stubContent.includes("import { BaseSeeder } from 'adonis-odm/seeders'"),
    'Should import BaseSeeder'
  )
  assert.ok(
    stubContent.includes("import { ObjectId } from 'mongodb'"),
    'Should import ObjectId for advanced usage'
  )

  // Check for advanced features
  assert.ok(stubContent.includes('static environment'), 'Should include environment restrictions')
  assert.ok(stubContent.includes('existingCount'), 'Should include duplicate checking')
  assert.ok(stubContent.includes('batchSize'), 'Should include batch processing')
  assert.ok(stubContent.includes('try {'), 'Should include error handling')
  assert.ok(stubContent.includes('console.log'), 'Should include progress logging')

  // Check for helper methods
  assert.ok(stubContent.includes('getSeedData'), 'Should include getSeedData method')
  assert.ok(stubContent.includes('chunkArray'), 'Should include chunkArray method')
  assert.ok(stubContent.includes('seedWithRelationships'), 'Should include relationship example')
  assert.ok(stubContent.includes('seedWithTransaction'), 'Should include transaction example')
})

test('Seeder Stubs - all stubs should use consistent template patterns', async () => {
  const stubPaths = [
    'stubs/make/odm_seeder/main.stub',
    'stubs/make/odm_seeder/simple.stub',
    'stubs/make/odm_seeder/advanced.stub',
  ]

  for (const stubPath of stubPaths) {
    const fullPath = join(process.cwd(), stubPath)
    const stubContent = await readFile(fullPath, 'utf-8')

    // All stubs should use consistent template variable patterns
    assert.ok(
      stubContent.includes('generators.modelName(entity.name)'),
      `${stubPath} should use modelName generator`
    )
    assert.ok(
      stubContent.includes('generators.modelFileName(entity.name)'),
      `${stubPath} should use modelFileName generator`
    )

    // All stubs should have proper exports configuration
    assert.ok(stubContent.includes('exports({'), `${stubPath} should have exports configuration`)
    assert.ok(
      stubContent.includes('app.seedersPath'),
      `${stubPath} should use seedersPath configuration`
    )

    // All stubs should extend BaseSeeder
    assert.ok(stubContent.includes('extends BaseSeeder'), `${stubPath} should extend BaseSeeder`)

    // All stubs should have run method
    assert.ok(
      stubContent.includes('async run(): Promise<void>'),
      `${stubPath} should have async run method`
    )
  }
})

test('Seeder Stubs - template variables should be properly formatted', async () => {
  const stubPath = join(process.cwd(), 'stubs/make/odm_seeder/main.stub')
  const stubContent = await readFile(stubPath, 'utf-8')

  // Check that template variables are properly closed
  const openBraces = (stubContent.match(/{{/g) || []).length
  const closeBraces = (stubContent.match(/}}/g) || []).length
  assert.equal(openBraces, closeBraces, 'Template should have matching opening and closing braces')

  // Check for proper variable definitions
  assert.ok(
    stubContent.includes('{{#var seederName = generators.modelName(entity.name)}}'),
    'Should have proper seederName variable definition'
  )
  assert.ok(
    stubContent.includes('{{#var seederFileName = generators.modelFileName(entity.name)}}'),
    'Should have proper seederFileName variable definition'
  )

  // Check for proper variable usage
  assert.ok(
    stubContent.includes('class {{ seederName }}'),
    'Should use seederName variable in class definition'
  )
  assert.ok(
    stubContent.includes('{{ entity.name'),
    'Should use entity.name in comments and examples'
  )
})

test('Seeder Stubs - should handle path configuration correctly', async () => {
  const stubPath = join(process.cwd(), 'stubs/make/odm_seeder/main.stub')
  const stubContent = await readFile(stubPath, 'utf-8')

  // Check for proper path handling
  assert.ok(stubContent.includes('app.seedersPath'), 'Should use app.seedersPath when available')
  assert.ok(stubContent.includes('database/seeders/'), 'Should fallback to default path')
  assert.ok(stubContent.includes('entity.path'), 'Should handle subdirectory paths')
  assert.ok(stubContent.includes('${seederFileName}.ts'), 'Should use proper file extension')
})
