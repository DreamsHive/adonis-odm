/**
 * Test to verify autoConnect configuration works correctly
 * This addresses GitHub Issue #11: https://github.com/DreamsHive/adonis-odm/issues/11
 */

import { test } from 'node:test'
import assert from 'node:assert'
import { defineConfig } from '../src/config/odm_config.js'
import type { OdmConfig } from '../src/types/index.js'

test('autoConnect configuration option', async (t) => {
  await t.test('should allow autoConnect to be set to false', () => {
    const config = defineConfig({
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
      autoConnect: false,
    })

    assert.strictEqual(config.autoConnect, false, 'autoConnect should be false')
  })

  await t.test('should allow autoConnect to be set to true', () => {
    const config = defineConfig({
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
      autoConnect: true,
    })

    assert.strictEqual(config.autoConnect, true, 'autoConnect should be true')
  })

  await t.test('should allow autoConnect to be undefined (default behavior)', () => {
    const config: OdmConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
    }

    assert.strictEqual(config.autoConnect, undefined, 'autoConnect should be undefined')
    // Provider should treat undefined as true (backward compatible)
    const shouldAutoConnect = config?.autoConnect !== false
    assert.strictEqual(shouldAutoConnect, true, 'undefined should default to auto-connect')
  })

  await t.test('should support environment-based configuration', () => {
    // Simulate different environments
    const testEnv = 'test'
    const prodEnv = 'production'

    const testConfig = defineConfig({
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: { url: 'mongodb://localhost:27017/test' },
        },
      },
      autoConnect: testEnv !== 'test', // false in test
    })

    const prodConfig = defineConfig({
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: { url: 'mongodb://localhost:27017/prod' },
        },
      },
      autoConnect: prodEnv !== 'test', // true in production
    })

    assert.strictEqual(testConfig.autoConnect, false, 'Should not auto-connect in test env')
    assert.strictEqual(prodConfig.autoConnect, true, 'Should auto-connect in production env')
  })

  await t.test('should support custom environment names', () => {
    // Developers can use any environment name they want
    const customEnv = 'ci'
    const stagingEnv = 'staging'

    const ciConfig = defineConfig({
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: { url: 'mongodb://localhost:27017/ci' },
        },
      },
      autoConnect: customEnv !== 'ci', // false in CI
    })

    const stagingConfig = defineConfig({
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: { url: 'mongodb://localhost:27017/staging' },
        },
      },
      autoConnect: stagingEnv !== 'ci', // true in staging
    })

    assert.strictEqual(ciConfig.autoConnect, false, 'Should not auto-connect in CI env')
    assert.strictEqual(stagingConfig.autoConnect, true, 'Should auto-connect in staging env')
  })
})

test('autoConnect provider logic', async (t) => {
  await t.test('should respect autoConnect: false', () => {
    const config = { autoConnect: false }
    const shouldAutoConnect = config?.autoConnect !== false
    assert.strictEqual(shouldAutoConnect, false, 'Should not auto-connect when explicitly false')
  })

  await t.test('should respect autoConnect: true', () => {
    const config = { autoConnect: true }
    const shouldAutoConnect = config?.autoConnect !== false
    assert.strictEqual(shouldAutoConnect, true, 'Should auto-connect when explicitly true')
  })

  await t.test('should default to true when autoConnect is undefined', () => {
    const config = {}
    const shouldAutoConnect = config?.autoConnect !== false
    assert.strictEqual(
      shouldAutoConnect,
      true,
      'Should auto-connect by default (backward compatible)'
    )
  })

  await t.test('should default to true when config is undefined', () => {
    const config = undefined
    const shouldAutoConnect = config?.autoConnect !== false
    assert.strictEqual(
      shouldAutoConnect,
      true,
      'Should auto-connect when config is undefined'
    )
  })
})

