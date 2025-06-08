import { test } from 'node:test'
import assert from 'node:assert'
import { writeFile, mkdir, rm, access } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'

// Test directories
const testDir = './tests/temp/integration/commands'
const seedersDir = join(testDir, 'seeders')

// Helper function to execute commands
async function executeCommand(
  command: string,
  args: string[] = [],
  options: any = {}
): Promise<{
  stdout: string
  stderr: string
  exitCode: number
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      ...options,
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
      })
    })

    child.on('error', (error) => {
      reject(error)
    })

    // Set a timeout for long-running commands
    setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('Command timeout'))
    }, 30000) // 30 second timeout
  })
}

// Helper function to check if MongoDB is available
async function isMongoAvailable(): Promise<boolean> {
  try {
    const result = await executeCommand('node', [
      '--loader',
      'ts-node-maintained/esm',
      '-e',
      `
        import { MongoDatabaseManager } from './src/database_manager.js';
        import { defineConfig } from './src/config/odm_config.js';
        
        const config = defineConfig({
          connection: 'mongodb',
          connections: {
            mongodb: {
              client: 'mongodb',
              connection: {
                url: process.env.MONGO_URL || 'mongodb://localhost:27017/adonis_odm_test',
              },
            },
          },
        });
        
        const dbManager = new MongoDatabaseManager(config);
        try {
          await dbManager.connect();
          await dbManager.close();
          console.log('MongoDB available');
        } catch (error) {
          console.error('MongoDB not available:', error.message);
          process.exit(1);
        }
      `,
    ])
    return result.exitCode === 0
  } catch (error) {
    return false
  }
}

test('Command Integration Tests Setup', async (t) => {
  await t.before(async () => {
    // Clean up any existing test directories
    await rm(testDir, { recursive: true, force: true })
    await mkdir(seedersDir, { recursive: true })
  })

  await t.after(async () => {
    // Clean up test directories
    await rm(testDir, { recursive: true, force: true })
  })

  await t.test('should have test environment ready', async () => {
    // Verify test directory was created
    await access(testDir)
    await access(seedersDir)
    assert.ok(true, 'Test directories created successfully')
  })
})

test('Make ODM Seeder Command Integration', async (t) => {
  await t.test('should generate seeder file with make:odm-seeder command', async () => {
    const seederName = 'TestIntegrationSeeder'

    // Execute the make:odm-seeder command
    const result = await executeCommand('node', [
      '--loader',
      'ts-node-maintained/esm',
      'examples/bin/console.ts',
      'make:odm-seeder',
      seederName,
      '--destination',
      seedersDir,
    ])

    // Verify command executed successfully
    assert.strictEqual(result.exitCode, 0, `Command failed: ${result.stderr}`)

    // Verify seeder file was created
    const expectedPath = join(seedersDir, `${seederName.toLowerCase()}_seeder.ts`)
    await access(expectedPath)

    // Verify file content
    const { readFile } = await import('node:fs/promises')
    const content = await readFile(expectedPath, 'utf-8')

    assert.ok(content.includes(`class ${seederName}Seeder`))
    assert.ok(content.includes('extends BaseSeeder'))
    assert.ok(content.includes('async run()'))
  })

  await t.test('should handle seeder generation errors gracefully', async () => {
    // Try to generate seeder with invalid name
    const result = await executeCommand('node', [
      '--loader',
      'ts-node-maintained/esm',
      'examples/bin/console.ts',
      'make:odm-seeder',
      '', // Empty name should cause error
      '--destination',
      seedersDir,
    ])

    // Command should fail gracefully
    assert.notStrictEqual(result.exitCode, 0)
    assert.ok(result.stderr.length > 0 || result.stdout.includes('error'))
  })
})

test('ODM Seed Command Integration', async (t) => {
  const mongoAvailable = await isMongoAvailable()

  if (!mongoAvailable) {
    console.log('⚠️  Skipping ODM seed command tests - MongoDB not available')
    return
  }

  await t.before(async () => {
    // Create test seeder files for command testing
    const testSeederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class CommandTestSeeder extends BaseSeeder {
  async run(): Promise<void> {
    const collection = this.getCollection('command_test_users')
    
    await collection.insertMany([
      {
        name: 'Command Test User 1',
        email: 'cmd1@test.com',
        createdAt: new Date(),
      },
      {
        name: 'Command Test User 2',
        email: 'cmd2@test.com', 
        createdAt: new Date(),
      },
    ])
  }
}
`

    const envSeederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class EnvironmentTestSeeder extends BaseSeeder {
  static environment = ['production']

  async run(): Promise<void> {
    const collection = this.getCollection('env_test_data')
    await collection.insertOne({
      message: 'This should only run in production',
    })
  }
}
`

    await writeFile(join(seedersDir, 'command_test_seeder.ts'), testSeederContent)
    await writeFile(join(seedersDir, 'environment_test_seeder.ts'), envSeederContent)
  })

  await t.test('should execute seeders with odm:seed command', async () => {
    // Execute the odm:seed command
    const result = await executeCommand(
      'node',
      [
        '--loader',
        'ts-node-maintained/esm',
        'examples/bin/console.ts',
        'odm:seed',
        '--files',
        join(seedersDir, 'command_test_seeder.ts'),
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: 'testing',
          MONGO_URL: process.env.MONGO_URL || 'mongodb://localhost:27017/adonis_odm_test',
        },
      }
    )

    // Verify command executed successfully
    assert.strictEqual(result.exitCode, 0, `Command failed: ${result.stderr}`)

    // Verify output contains success messages
    assert.ok(result.stdout.includes('Starting ODM seeder execution'))
    assert.ok(result.stdout.includes('CommandTestSeeder') || result.stdout.includes('executed'))
  })

  await t.test('should handle environment restrictions in command', async () => {
    // Execute seeder that's restricted to production
    const result = await executeCommand(
      'node',
      [
        '--loader',
        'ts-node-maintained/esm',
        'examples/bin/console.ts',
        'odm:seed',
        '--files',
        join(seedersDir, 'environment_test_seeder.ts'),
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: 'testing', // Not production
          MONGO_URL: process.env.MONGO_URL || 'mongodb://localhost:27017/adonis_odm_test',
        },
      }
    )

    // Command should succeed but seeder should be skipped
    assert.strictEqual(result.exitCode, 0)
    assert.ok(
      result.stdout.includes('skipped') || result.stdout.includes('Environment restriction')
    )
  })

  await t.test('should run all seeders when no files specified', async () => {
    // Execute odm:seed without specific files
    const result = await executeCommand(
      'node',
      ['--loader', 'ts-node-maintained/esm', 'examples/bin/console.ts', 'odm:seed'],
      {
        env: {
          ...process.env,
          NODE_ENV: 'testing',
          MONGO_URL: process.env.MONGO_URL || 'mongodb://localhost:27017/adonis_odm_test',
        },
      }
    )

    // Verify command executed successfully
    assert.strictEqual(result.exitCode, 0, `Command failed: ${result.stderr}`)

    // Verify output indicates running all seeders
    assert.ok(
      result.stdout.includes('Running all available seeders') ||
        result.stdout.includes('Seeder execution completed')
    )
  })

  await t.test('should handle connection flag', async () => {
    // Execute with specific connection
    const result = await executeCommand(
      'node',
      [
        '--loader',
        'ts-node-maintained/esm',
        'examples/bin/console.ts',
        'odm:seed',
        '--connection',
        'mongodb',
        '--files',
        join(seedersDir, 'command_test_seeder.ts'),
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: 'testing',
          MONGO_URL: process.env.MONGO_URL || 'mongodb://localhost:27017/adonis_odm_test',
        },
      }
    )

    // Verify command executed successfully
    assert.strictEqual(result.exitCode, 0, `Command failed: ${result.stderr}`)

    // Verify output mentions the connection
    assert.ok(
      result.stdout.includes('Using connection: mongodb') || result.stdout.includes('executed')
    )
  })

  await t.test('should display help information', async () => {
    // Execute odm:seed with help flag
    const result = await executeCommand('node', [
      '--loader',
      'ts-node-maintained/esm',
      'examples/bin/console.ts',
      'odm:seed',
      '--help',
    ])

    // Verify help is displayed
    assert.ok(
      result.stdout.includes('Execute ODM database seeders') ||
        result.stdout.includes('--files') ||
        result.stdout.includes('--interactive')
    )
  })
})

test('Command Error Handling Integration', async (t) => {
  await t.test('should handle invalid command gracefully', async () => {
    // Execute non-existent command
    const result = await executeCommand('node', [
      '--loader',
      'ts-node-maintained/esm',
      'examples/bin/console.ts',
      'invalid:command',
    ])

    // Command should fail with appropriate error
    assert.notStrictEqual(result.exitCode, 0)
    assert.ok(
      result.stderr.includes('command not found') ||
        result.stdout.includes('Unknown command') ||
        result.stderr.length > 0
    )
  })

  await t.test('should handle missing seeder files', async () => {
    const mongoAvailable = await isMongoAvailable()

    if (!mongoAvailable) {
      console.log('⚠️  Skipping missing files test - MongoDB not available')
      return
    }

    // Execute odm:seed with non-existent file
    const result = await executeCommand(
      'node',
      [
        '--loader',
        'ts-node-maintained/esm',
        'examples/bin/console.ts',
        'odm:seed',
        '--files',
        './non-existent-seeder.ts',
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: 'testing',
          MONGO_URL: process.env.MONGO_URL || 'mongodb://localhost:27017/adonis_odm_test',
        },
      }
    )

    // Command should handle missing files gracefully
    // Either succeed with no seeders found or fail with appropriate error
    assert.ok(result.exitCode === 0 || result.stderr.length > 0)
  })
})
