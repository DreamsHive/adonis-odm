import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import { stubsRoot } from '../stubs/main.js'
import { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Command to generate ODM seeder files
 *
 * This command creates new seeder files using predefined templates.
 * It supports multiple stub templates and subdirectory organization.
 *
 * @example
 * ```bash
 * # Generate a basic seeder
 * node ace make:odm-seeder User
 *
 * # Generate with simple template
 * node ace make:odm-seeder User --stub=simple
 *
 * # Generate with advanced template
 * node ace make:odm-seeder User --stub=advanced
 *
 * # Generate in subdirectory
 * node ace make:odm-seeder admin/User
 * ```
 */
export default class MakeOdmSeeder extends BaseCommand {
  static commandName = 'make:odm-seeder'
  static description = 'Create a new ODM seeder file'
  static options: CommandOptions = {
    allowUnknownFlags: true,
  }

  /**
   * The name of the seeder
   */
  @args.string({ description: 'Name of the seeder class' })
  declare name: string

  /**
   * Stub template to use for generation
   */
  @flags.string({
    description: 'Stub template to use (main, simple, advanced)',
    default: 'main',
  })
  declare stub: string

  /**
   * Execute the command
   */
  async run(): Promise<void> {
    // Validate stub template
    const validStubs = ['main', 'simple', 'advanced']
    if (!validStubs.includes(this.stub)) {
      this.logger.error(
        `Invalid stub template "${this.stub}". Valid options: ${validStubs.join(', ')}`
      )
      return
    }

    // Create entity from the provided name
    const entity = this.app.generators.createEntity(this.name)

    // Determine the stub file path
    const stubPath = `make/odm_seeder/${this.stub}.stub`

    try {
      // Generate the seeder file using the selected stub
      const codemods = await this.createCodemods()
      await codemods.makeUsingStub(stubsRoot, stubPath, {
        flags: this.parsed.flags,
        entity: entity,
      })

      // Success message
      const seederName = this.app.generators.modelName(entity.name)
      const outputPath = this.getOutputPath(entity)

      this.logger.success(`Created seeder ${this.colors.cyan(seederName)}`)
      this.logger.info(`File: ${this.colors.dim(outputPath)}`)

      if (this.stub !== 'main') {
        this.logger.info(`Template: ${this.colors.dim(this.stub)}`)
      }
    } catch (error) {
      this.logger.error(`Failed to create seeder: ${error.message}`)
      throw error
    }
  }

  /**
   * Get the expected output path for the seeder file
   */
  private getOutputPath(entity: any): string {
    const fileName = this.app.generators.modelFileName(entity.name)
    const basePath = 'database/seeders'

    if (entity.path) {
      return `${basePath}/${entity.path}/${fileName}.ts`
    }

    return `${basePath}/${fileName}.ts`
  }

  /**
   * Display help information
   */
  static help = [
    'The make:odm-seeder command generates new seeder files for populating your MongoDB database.',
    '',
    'Available stub templates:',
    '  main     - Comprehensive template with examples and documentation (default)',
    '  simple   - Minimal template for basic use cases',
    '  advanced - Feature-rich template with advanced patterns',
    '',
    'Examples:',
    '  node ace make:odm-seeder User',
    '  node ace make:odm-seeder User --stub=simple',
    '  node ace make:odm-seeder User --stub=advanced',
    '  node ace make:odm-seeder admin/User',
    '',
    'The generated seeder will extend BaseSeeder and include:',
    '- Environment restriction support',
    '- Database access through this.client',
    '- Collection access through this.getCollection()',
    '- Examples and best practices',
  ].join('\n')
}
