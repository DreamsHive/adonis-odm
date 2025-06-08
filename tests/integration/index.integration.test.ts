import { test } from 'node:test'
import assert from 'node:assert'
import { spawn } from 'node:child_process'

/**
 * Integration Test Suite Runner
 *
 * This file serves as the main entry point for all integration tests.
 * It provides utilities for running integration tests and checking prerequisites.
 */

// Helper function to check if MongoDB is available
async function checkMongoAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(
      'node',
      [
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
          process.exit(0);
        } catch (error) {
          console.error('MongoDB not available:', error.message);
          process.exit(1);
        }
      `,
      ],
      {
        stdio: 'pipe',
      }
    )

    let output = ''
    child.stdout?.on('data', (data) => {
      output += data.toString()
    })

    child.stderr?.on('data', (data) => {
      output += data.toString()
    })

    child.on('close', (code) => {
      resolve(code === 0)
    })

    child.on('error', () => {
      resolve(false)
    })

    // Timeout after 10 seconds
    setTimeout(() => {
      child.kill('SIGTERM')
      resolve(false)
    }, 10000)
  })
}

// Helper function to run a test file
async function runTestFile(testFile: string): Promise<{
  success: boolean
  output: string
  error?: string
}> {
  return new Promise((resolve) => {
    const child = spawn('node', ['--loader', 'ts-node-maintained/esm', '--test', testFile], {
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'testing',
        MONGO_URL: process.env.MONGO_URL || 'mongodb://localhost:27017/adonis_odm_test',
        MONGO_SECONDARY_URL:
          process.env.MONGO_SECONDARY_URL || 'mongodb://localhost:27017/adonis_odm_test_secondary',
        MONGO_TENANT_URL:
          process.env.MONGO_TENANT_URL || 'mongodb://localhost:27017/adonis_odm_test_tenant',
      },
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
        success: code === 0,
        output: stdout,
        error: stderr,
      })
    })

    child.on('error', (error) => {
      resolve({
        success: false,
        output: stdout,
        error: error.message,
      })
    })

    // Timeout after 2 minutes
    setTimeout(() => {
      child.kill('SIGTERM')
      resolve({
        success: false,
        output: stdout,
        error: 'Test timeout',
      })
    }, 120000)
  })
}

test('Integration Test Suite', async (t) => {
  await t.test('should check MongoDB availability', async () => {
    const mongoAvailable = await checkMongoAvailability()

    if (!mongoAvailable) {
      console.log('')
      console.log('⚠️  MongoDB is not available for integration tests')
      console.log('💡 To run integration tests with MongoDB:')
      console.log('   1. Start MongoDB: docker run -d -p 27017:27017 mongo:latest')
      console.log('   2. Or use Docker Compose: docker-compose up -d')
      console.log('   3. Set MONGO_URL environment variable if using custom connection')
      console.log('')
      console.log('🔄 Integration tests will be skipped without MongoDB')
      return
    }

    assert.ok(mongoAvailable, 'MongoDB should be available for integration tests')
    console.log('✅ MongoDB is available for integration tests')
  })

  await t.test('should run seeder integration tests', async () => {
    const mongoAvailable = await checkMongoAvailability()

    if (!mongoAvailable) {
      console.log('⚠️  Skipping seeder integration tests - MongoDB not available')
      return
    }

    console.log('🧪 Running seeder integration tests...')
    const result = await runTestFile('./tests/integration/seeders.integration.test.ts')

    if (!result.success) {
      console.error('❌ Seeder integration tests failed:')
      console.error(result.error || result.output)
    } else {
      console.log('✅ Seeder integration tests passed')
    }

    assert.ok(result.success, 'Seeder integration tests should pass')
  })

  await t.test('should run command integration tests', async () => {
    const mongoAvailable = await checkMongoAvailability()

    if (!mongoAvailable) {
      console.log('⚠️  Skipping command integration tests - MongoDB not available')
      return
    }

    console.log('🧪 Running command integration tests...')
    const result = await runTestFile('./tests/integration/commands.integration.test.ts')

    if (!result.success) {
      console.error('❌ Command integration tests failed:')
      console.error(result.error || result.output)
    } else {
      console.log('✅ Command integration tests passed')
    }

    assert.ok(result.success, 'Command integration tests should pass')
  })

  await t.test('should run multi-connection integration tests', async () => {
    const mongoAvailable = await checkMongoAvailability()

    if (!mongoAvailable) {
      console.log('⚠️  Skipping multi-connection integration tests - MongoDB not available')
      return
    }

    console.log('🧪 Running multi-connection integration tests...')
    const result = await runTestFile('./tests/integration/multi-connection.integration.test.ts')

    if (!result.success) {
      console.error('❌ Multi-connection integration tests failed:')
      console.error(result.error || result.output)
    } else {
      console.log('✅ Multi-connection integration tests passed')
    }

    assert.ok(result.success, 'Multi-connection integration tests should pass')
  })
})

test('Integration Test Environment', async (t) => {
  await t.test('should have required environment variables', () => {
    // Check for required environment variables
    const nodeEnv = process.env.NODE_ENV || 'testing'

    // Set NODE_ENV if not set (for testing purposes)
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'testing'
    }

    assert.ok(process.env.NODE_ENV, 'NODE_ENV should be set')

    // Log environment info
    console.log(`📋 Test Environment: ${nodeEnv}`)
    console.log(
      `🔗 MongoDB URL: ${process.env.MONGO_URL || 'mongodb://localhost:27017/adonis_odm_test'}`
    )
  })

  await t.test('should have test directories available', async () => {
    const { access } = await import('node:fs/promises')

    try {
      await access('./tests')
      await access('./src')
      await access('./examples')
    } catch (error) {
      assert.fail('Required directories should be available')
    }

    assert.ok(true, 'Test directories are available')
  })

  await t.test('should be able to load core modules', async () => {
    try {
      const { MongoDatabaseManager } = await import('../../src/database_manager.js')
      const { SeederManager } = await import('../../src/seeders/seeder_manager.js')
      const { BaseSeeder } = await import('../../src/seeders/base_seeder.js')
      const { defineConfig } = await import('../../src/config/odm_config.js')

      assert.ok(MongoDatabaseManager, 'MongoDatabaseManager should be loadable')
      assert.ok(SeederManager, 'SeederManager should be loadable')
      assert.ok(BaseSeeder, 'BaseSeeder should be loadable')
      assert.ok(defineConfig, 'defineConfig should be loadable')
    } catch (error) {
      assert.fail(`Core modules should be loadable: ${error.message}`)
    }
  })
})

// Export utilities for use in other test files
export { checkMongoAvailability, runTestFile }
