import { BaseCommand, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import type { SeederManager, SeederResult } from '../src/seeders/seeder_manager.js'

/**
 * Command to execute ODM database seeders
 *
 * This command provides comprehensive seeder execution capabilities including:
 * - Running all seeders or specific files
 * - Interactive seeder selection
 * - Connection-specific execution
 * - Environment-aware execution with clear feedback
 * - Progress indication and error reporting
 *
 * @example
 * ```bash
 * # Run all seeders
 * node ace odm:seed
 *
 * # Run specific seeders
 * node ace odm:seed --files="./database/seeders/user_seeder.ts,./database/seeders/post_seeder.ts"
 *
 * # Interactive mode
 * node ace odm:seed --interactive
 *
 * # Specific connection
 * node ace odm:seed --connection=tenant-1
 * ```
 */
export default class OdmSeed extends BaseCommand {
  static commandName = 'odm:seed'
  static description = 'Execute ODM database seeders'
  static options: CommandOptions = {
    allowUnknownFlags: false,
  }

  /**
   * Specify seeder files to run
   */
  @flags.array({
    description: 'Specify seeder files to run (comma-separated paths)',
    alias: 'f',
  })
  declare files?: string[]

  /**
   * Run in interactive mode for seeder selection
   */
  @flags.boolean({
    description: 'Run in interactive mode to select seeders',
    alias: 'i',
  })
  declare interactive?: boolean

  /**
   * Specify database connection to use
   */
  @flags.string({
    description: 'Specify database connection to use',
    alias: 'c',
  })
  declare connection?: string

  /**
   * Execute the command
   */
  async run(): Promise<void> {
    try {
      // Get the seeder manager from the IoC container
      const seederManager = await this.app.container.make('odm.seeder')

      this.logger.info('Starting ODM seeder execution...')

      if (this.interactive) {
        await this.runInteractiveMode(seederManager)
      } else {
        await this.runSeeders(seederManager)
      }
    } catch (error) {
      this.logger.error('Failed to execute seeders')
      this.logger.error(error instanceof Error ? error.message : String(error))
      this.exitCode = 1
    }
  }

  /**
   * Run seeders based on provided options
   */
  private async runSeeders(seederManager: SeederManager): Promise<void> {
    const options = {
      files: this.files,
      connection: this.connection,
      environment: process.env.NODE_ENV || 'development',
    }

    // Validate connection if specified
    if (this.connection) {
      await this.validateConnection(seederManager, this.connection)
    }

    // Show execution summary
    if (this.files && this.files.length > 0) {
      this.logger.info(`Running ${this.files.length} specific seeder(s)`)
      this.files.forEach((file) => this.logger.info(`  - ${file}`))
    } else {
      this.logger.info('Running all available seeders')
    }

    if (this.connection) {
      this.logger.info(`Using connection: ${this.colors.cyan(this.connection)}`)
    } else {
      const defaultConnection = seederManager.getConfig().defaultConnection
      this.logger.info(`Using default connection: ${this.colors.cyan(defaultConnection)}`)
    }

    this.logger.info(`Environment: ${this.colors.cyan(options.environment)}`)
    this.logger.info('')

    // Execute seeders
    const results = await seederManager.run(options)

    // Display results
    this.displayResults(results)
  }

  /**
   * Run in interactive mode to select seeders
   */
  private async runInteractiveMode(seederManager: SeederManager): Promise<void> {
    this.logger.info('Interactive seeder selection mode')
    this.logger.info('')

    try {
      // Get all available seeder files
      const allSeeders = await seederManager.getSeederFiles()

      if (allSeeders.length === 0) {
        this.logger.warning('No seeder files found')
        return
      }

      // Prepare choices for multi-select prompt
      const choices = allSeeders.map((file) => ({
        name: file,
        message: this.getSeederDisplayName(file),
        hint: this.getSeederHint(file),
      }))

      this.logger.info(`Found ${allSeeders.length} seeder(s)`)
      this.logger.info('')

      // Validate connection if specified
      if (this.connection) {
        await this.validateConnection(seederManager, this.connection)
      }

      // Display environment and connection info
      const environment = process.env.NODE_ENV || 'development'
      this.logger.info(`Environment: ${this.colors.cyan(environment)}`)

      if (this.connection) {
        this.logger.info(`Connection: ${this.colors.cyan(this.connection)}`)
      } else {
        const defaultConnection = seederManager.getConfig().defaultConnection
        this.logger.info(`Default connection: ${this.colors.cyan(defaultConnection)}`)
      }

      // Show available connections
      const availableConnections = seederManager.getAvailableConnections()
      this.logger.info(`Available connections: ${this.colors.dim(availableConnections.join(', '))}`)
      this.logger.info('')

      // Multi-select prompt for seeder selection
      const selectedFiles = await this.prompt.multiple('Select seeders to run', choices)

      if (selectedFiles.length === 0) {
        this.logger.info('No seeders selected')
        return
      }

      // Display selected seeders
      this.logger.info(`Selected ${selectedFiles.length} seeder(s):`)
      selectedFiles.forEach((file) => {
        const name = this.getSeederDisplayName(file)
        this.logger.info(`  ${this.colors.green('✓')} ${name}`)
      })
      this.logger.info('')

      // Confirmation prompt
      const confirmed = await this.prompt.confirm(`Run ${selectedFiles.length} seeder(s)?`)

      if (!confirmed) {
        this.logger.info('Seeder execution cancelled')
        return
      }

      this.logger.info('')

      // Execute selected seeders
      const options = {
        files: selectedFiles,
        connection: this.connection,
        environment,
      }

      const results = await seederManager.run(options)
      this.displayResults(results)
    } catch (error) {
      this.logger.error('Interactive mode failed')
      throw error
    }
  }

  /**
   * Display seeder execution results
   */
  private displayResults(results: SeederResult[]): void {
    this.logger.info('Seeder execution completed')
    this.logger.info('='.repeat(50))

    let executed = 0
    let skipped = 0
    let failed = 0

    results.forEach((result) => {
      if (result.executed) {
        executed++
        const time = result.executionTime ? ` (${result.executionTime}ms)` : ''
        this.logger.success(`✓ ${result.name}${time}`)
      } else if (result.error) {
        failed++
        this.logger.error(`✗ ${result.name}: ${result.error.message}`)
      } else {
        skipped++
        this.logger.warning(`⚠ ${result.name}: ${result.skipReason || 'Skipped'}`)
      }
    })

    this.logger.info('')
    this.logger.info(`Summary: ${executed} executed, ${skipped} skipped, ${failed} failed`)

    if (failed > 0) {
      this.exitCode = 1
    }
  }

  /**
   * Get display name for a seeder file
   */
  private getSeederDisplayName(filePath: string): string {
    const fileName = filePath.split('/').pop() || filePath
    return fileName.replace(/\.(ts|js|mts|mjs)$/, '')
  }

  /**
   * Get hint text for a seeder file
   */
  private getSeederHint(_filePath: string): string {
    const environment = process.env.NODE_ENV || 'development'
    const connection = this.connection || 'default'
    return `${environment} | ${connection}`
  }

  /**
   * Validate connection and provide helpful feedback
   */
  private async validateConnection(
    seederManager: SeederManager,
    connectionName: string
  ): Promise<void> {
    if (!seederManager.isValidConnection(connectionName)) {
      const availableConnections = seederManager.getAvailableConnections()
      this.logger.error(`Invalid connection "${connectionName}"`)
      this.logger.error(`Available connections: ${availableConnections.join(', ')}`)
      throw new Error(`Connection "${connectionName}" not found in configuration`)
    }

    this.logger.info(`✓ Connection "${connectionName}" is valid`)
  }

  /**
   * Display help information
   */
  static help = [
    'The odm:seed command executes database seeders to populate your MongoDB database.',
    '',
    'Options:',
    '  --files, -f      Specify seeder files to run (comma-separated paths)',
    '  --interactive, -i Run in interactive mode to select seeders',
    '  --connection, -c Specify database connection to use',
    '',
    'Examples:',
    '  node ace odm:seed',
    '  node ace odm:seed --files="./database/seeders/user_seeder.ts"',
    '  node ace odm:seed --interactive',
    '  node ace odm:seed --connection=tenant-1',
    '',
    'The command will:',
    '- Execute seeders in alphabetical order by default',
    '- Respect environment restrictions defined in seeder classes',
    '- Provide detailed execution feedback and error reporting',
    '- Skip seeders that are restricted to other environments',
  ]
}
