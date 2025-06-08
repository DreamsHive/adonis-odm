import { test } from 'node:test'
import assert from 'node:assert'
import OdmSeed from '../../../commands/odm_seed.js'
import type { SeederManager, SeederResult } from '../../../src/seeders/seeder_manager.js'

// Simplified test approach - focus on testing the command properties and basic functionality

// Mock SeederManager
class MockSeederManager {
  private mockResults: SeederResult[] = []
  private mockSeederFiles: string[] = []

  setMockResults(results: SeederResult[]) {
    this.mockResults = results
  }

  setMockSeederFiles(files: string[]) {
    this.mockSeederFiles = files
  }

  async run(options: any = {}): Promise<SeederResult[]> {
    return this.mockResults
  }

  async getSeederFiles(): Promise<string[]> {
    return this.mockSeederFiles
  }
}

// Mock Application
class MockApplication {
  private container = new Map()

  constructor() {
    this.container.set('odm.seeder', new MockSeederManager())
  }

  async make<T>(key: string): Promise<T> {
    return this.container.get(key) as T
  }
}

// Mock Logger
class MockLogger {
  private logs: Array<{ level: string; message: string }> = []

  info(message: string) {
    this.logs.push({ level: 'info', message })
  }

  error(message: string) {
    this.logs.push({ level: 'error', message })
  }

  success(message: string) {
    this.logs.push({ level: 'success', message })
  }

  warning(message: string) {
    this.logs.push({ level: 'warning', message })
  }

  getLogs() {
    return this.logs
  }

  clearLogs() {
    this.logs = []
  }
}

// Mock Prompt
class MockPrompt {
  private responses: any[] = []
  private currentIndex = 0

  setResponses(responses: any[]) {
    this.responses = responses
    this.currentIndex = 0
  }

  async ask(question: string, options?: any): Promise<string> {
    if (this.currentIndex >= this.responses.length) {
      throw new Error('No more mock responses available')
    }
    return this.responses[this.currentIndex++]
  }

  async multiple(question: string, choices: any[]): Promise<string[]> {
    if (this.currentIndex >= this.responses.length) {
      throw new Error('No more mock responses available')
    }
    const response = this.responses[this.currentIndex++]
    // If response is an array, return it directly
    // If it's a string like 'all', return all choice names
    if (Array.isArray(response)) {
      return response
    }
    if (response === 'all') {
      return choices.map((choice) => choice.name || choice)
    }
    // If it's a string with indices like '1,3', convert to file paths
    if (typeof response === 'string' && response.includes(',')) {
      const indices = response.split(',').map((n) => Number.parseInt(n.trim()) - 1)
      return indices.map((i) => choices[i]?.name || choices[i])
    }
    return []
  }

  async confirm(question: string): Promise<boolean> {
    if (this.currentIndex >= this.responses.length) {
      throw new Error('No more mock responses available')
    }
    const response = this.responses[this.currentIndex++]
    return Boolean(response)
  }
}

// Create mock command instance
const createMockCommand = (): {
  command: OdmSeed
  app: MockApplication
  logger: MockLogger
  prompt: MockPrompt
  getExitCode: () => number
  setExitCode: (code: number) => void
} => {
  const command = new OdmSeed()
  const app = new MockApplication()
  const logger = new MockLogger()
  const prompt = new MockPrompt()
  let exitCode = 0

  // Override properties using Object.defineProperty
  Object.defineProperty(command, 'app', {
    value: app,
    writable: true,
    configurable: true,
  })

  Object.defineProperty(command, 'logger', {
    value: logger,
    writable: true,
    configurable: true,
  })

  Object.defineProperty(command, 'prompt', {
    value: prompt,
    writable: true,
    configurable: true,
  })

  Object.defineProperty(command, 'exitCode', {
    get: () => exitCode,
    set: (code: number) => {
      exitCode = code
    },
    configurable: true,
  })

  return {
    command,
    app,
    logger,
    prompt,
    getExitCode: () => exitCode,
    setExitCode: (code: number) => {
      exitCode = code
    },
  }
}

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
  })
})

test('OdmSeed Command - Flag Handling', async (t) => {
  await t.test('should handle files flag', async () => {
    const { command, app, logger } = createMockCommand()
    command.files = ['./database/seeders/user_seeder.ts', './database/seeders/post_seeder.ts']

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockResults([
      { name: 'UserSeeder', filePath: './database/seeders/user_seeder.ts', executed: true },
      { name: 'PostSeeder', filePath: './database/seeders/post_seeder.ts', executed: true },
    ])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.message.includes('Running 2 specific seeder(s)')))
  })

  await t.test('should handle connection flag', async () => {
    const { command, app, logger } = createMockCommand()
    command.connection = 'tenant-1'

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockResults([])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.message.includes('Using connection: tenant-1')))
  })

  await t.test('should handle interactive flag', async () => {
    const { command, app, logger, prompt } = createMockCommand()
    command.interactive = true

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockSeederFiles([
      './database/seeders/user_seeder.ts',
      './database/seeders/post_seeder.ts',
    ])
    seederManager.setMockResults([])

    // Mock responses: multi-select returns all files, confirm returns true
    prompt.setResponses([
      ['./database/seeders/user_seeder.ts', './database/seeders/post_seeder.ts'],
      true,
    ])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.message.includes('Interactive seeder selection mode')))
  })
})

test('OdmSeed Command - Execution Modes', async (t) => {
  await t.test('should run all seeders by default', async () => {
    const { command, app, logger } = createMockCommand()

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockResults([
      { name: 'UserSeeder', filePath: './user_seeder.ts', executed: true, executionTime: 150 },
      { name: 'PostSeeder', filePath: './post_seeder.ts', executed: true, executionTime: 200 },
    ])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.message.includes('Running all available seeders')))
    assert.ok(logs.some((log) => log.message.includes('2 executed, 0 skipped, 0 failed')))
  })

  await t.test('should run specific files when provided', async () => {
    const { command, app, logger } = createMockCommand()
    command.files = ['./database/seeders/user_seeder.ts']

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockResults([
      { name: 'UserSeeder', filePath: './database/seeders/user_seeder.ts', executed: true },
    ])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.message.includes('Running 1 specific seeder(s)')))
    assert.ok(logs.some((log) => log.message.includes('./database/seeders/user_seeder.ts')))
  })
})

test('OdmSeed Command - Interactive Mode', async (t) => {
  await t.test('should display seeder count and environment info in interactive mode', async () => {
    const { command, app, logger, prompt } = createMockCommand()
    command.interactive = true

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockSeederFiles([
      './database/seeders/user_seeder.ts',
      './database/seeders/post_seeder.ts',
    ])
    seederManager.setMockResults([])

    // Mock responses: multi-select returns all files, confirm returns true
    prompt.setResponses([
      ['./database/seeders/user_seeder.ts', './database/seeders/post_seeder.ts'],
      true,
    ])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.message.includes('Found 2 seeder(s)')))
    assert.ok(logs.some((log) => log.message.includes('Environment:')))
  })

  await t.test('should handle multi-select all seeders in interactive mode', async () => {
    const { command, app, logger, prompt } = createMockCommand()
    command.interactive = true

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockSeederFiles([
      './database/seeders/user_seeder.ts',
      './database/seeders/post_seeder.ts',
    ])
    seederManager.setMockResults([
      { name: 'UserSeeder', filePath: './database/seeders/user_seeder.ts', executed: true },
      { name: 'PostSeeder', filePath: './database/seeders/post_seeder.ts', executed: true },
    ])

    // Mock responses: multi-select returns all files, confirm returns true
    prompt.setResponses([
      ['./database/seeders/user_seeder.ts', './database/seeders/post_seeder.ts'],
      true,
    ])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.message.includes('Selected 2 seeder(s):')))
    assert.ok(logs.some((log) => log.message.includes('✓ user_seeder')))
    assert.ok(logs.some((log) => log.message.includes('✓ post_seeder')))
  })

  await t.test('should handle specific seeder selection in interactive mode', async () => {
    const { command, app, logger, prompt } = createMockCommand()
    command.interactive = true

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockSeederFiles([
      './database/seeders/user_seeder.ts',
      './database/seeders/post_seeder.ts',
      './database/seeders/admin_seeder.ts',
    ])
    seederManager.setMockResults([
      { name: 'UserSeeder', filePath: './database/seeders/user_seeder.ts', executed: true },
      { name: 'AdminSeeder', filePath: './database/seeders/admin_seeder.ts', executed: true },
    ])

    // Mock responses: multi-select returns specific files, confirm returns true
    prompt.setResponses([
      ['./database/seeders/user_seeder.ts', './database/seeders/admin_seeder.ts'],
      true,
    ])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.message.includes('Selected 2 seeder(s):')))
    assert.ok(logs.some((log) => log.message.includes('✓ user_seeder')))
    assert.ok(logs.some((log) => log.message.includes('✓ admin_seeder')))
  })

  await t.test('should handle no seeders selected in interactive mode', async () => {
    const { command, app, logger, prompt } = createMockCommand()
    command.interactive = true

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockSeederFiles([
      './database/seeders/user_seeder.ts',
      './database/seeders/post_seeder.ts',
    ])

    // Mock responses: multi-select returns empty array
    prompt.setResponses([[]])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.message.includes('No seeders selected')))
  })

  await t.test('should handle confirmation cancellation in interactive mode', async () => {
    const { command, app, logger, prompt } = createMockCommand()
    command.interactive = true

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockSeederFiles([
      './database/seeders/user_seeder.ts',
      './database/seeders/post_seeder.ts',
    ])

    // Mock responses: multi-select returns files, confirm returns false
    prompt.setResponses([['./database/seeders/user_seeder.ts'], false])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.message.includes('Seeder execution cancelled')))
  })

  await t.test('should handle no seeders found in interactive mode', async () => {
    const { command, app, logger, prompt } = createMockCommand()
    command.interactive = true

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockSeederFiles([])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.message.includes('No seeder files found')))
  })
})

test('OdmSeed Command - Result Display', async (t) => {
  await t.test('should display successful execution results', async () => {
    const { command, app, logger } = createMockCommand()

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockResults([
      { name: 'UserSeeder', filePath: './user_seeder.ts', executed: true, executionTime: 150 },
      { name: 'PostSeeder', filePath: './post_seeder.ts', executed: true, executionTime: 200 },
    ])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(
      logs.some((log) => log.level === 'success' && log.message.includes('UserSeeder (150ms)'))
    )
    assert.ok(
      logs.some((log) => log.level === 'success' && log.message.includes('PostSeeder (200ms)'))
    )
    assert.ok(logs.some((log) => log.message.includes('2 executed, 0 skipped, 0 failed')))
  })

  await t.test('should display skipped seeder results', async () => {
    const { command, app, logger } = createMockCommand()

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockResults([
      { name: 'UserSeeder', filePath: './user_seeder.ts', executed: true },
      {
        name: 'ProdSeeder',
        filePath: './prod_seeder.ts',
        executed: false,
        skipReason:
          'Environment restriction: seeder only runs in [production], current: development',
      },
    ])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.level === 'success' && log.message.includes('UserSeeder')))
    assert.ok(logs.some((log) => log.level === 'warning' && log.message.includes('ProdSeeder')))
    assert.ok(logs.some((log) => log.message.includes('1 executed, 1 skipped, 0 failed')))
  })

  await t.test('should display failed seeder results and set exit code', async () => {
    const { command, app, logger } = createMockCommand()

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockResults([
      { name: 'UserSeeder', filePath: './user_seeder.ts', executed: true },
      {
        name: 'FailingSeeder',
        filePath: './failing_seeder.ts',
        executed: false,
        error: new Error('Database connection failed'),
      },
    ])

    await command.run()

    const logs = logger.getLogs()
    assert.ok(logs.some((log) => log.level === 'success' && log.message.includes('UserSeeder')))
    assert.ok(logs.some((log) => log.level === 'error' && log.message.includes('FailingSeeder')))
    assert.ok(logs.some((log) => log.message.includes('1 executed, 0 skipped, 1 failed')))
    assert.strictEqual(command.exitCode, 1)
  })
})

test('OdmSeed Command - Error Handling', async (t) => {
  await t.test('should handle seeder manager initialization errors', async () => {
    const { command, app, logger } = createMockCommand()

    // Mock app.container.make to throw an error
    app.make = async () => {
      throw new Error('Failed to initialize SeederManager')
    }

    await command.run()

    const logs = logger.getLogs()
    assert.ok(
      logs.some((log) => log.level === 'error' && log.message.includes('Failed to execute seeders'))
    )
    assert.ok(
      logs.some(
        (log) => log.level === 'error' && log.message.includes('Failed to initialize SeederManager')
      )
    )
    assert.strictEqual(command.exitCode, 1)
  })

  await t.test('should handle interactive mode errors gracefully', async () => {
    const { command, app, logger, prompt } = createMockCommand()
    command.interactive = true

    const seederManager = await app.make<MockSeederManager>('odm.seeder')
    seederManager.setMockSeederFiles(['./test_seeder.ts'])

    // Mock prompt to throw an error
    prompt.multiple = async () => {
      throw new Error('Prompt failed')
    }

    await command.run()

    const logs = logger.getLogs()
    assert.ok(
      logs.some((log) => log.level === 'error' && log.message.includes('Failed to execute seeders'))
    )
    assert.strictEqual(command.exitCode, 1)
  })
})
