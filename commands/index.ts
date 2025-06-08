/**
 * AdonisJS MongoDB ODM Commands
 */

import type { CommandMetaData } from '@adonisjs/ace/types'
import type { BaseCommand } from '@adonisjs/core/ace'
import MakeOdmModel from './make_odm_model.js'
import MakeOdmSeeder from './make_odm_seeder.js'
import OdmSeed from './odm_seed.js'

/**
 * Returns an array of command metadata
 */
export async function getMetaData(): Promise<CommandMetaData[]> {
  return [
    {
      commandName: MakeOdmModel.commandName,
      description: MakeOdmModel.description,
      namespace: null,
      aliases: MakeOdmModel.aliases || [],
      flags: [],
      args: [],
      options: MakeOdmModel.options || {},
    },
    {
      commandName: MakeOdmSeeder.commandName,
      description: MakeOdmSeeder.description,
      namespace: null,
      aliases: MakeOdmSeeder.aliases || [],
      flags: [],
      args: [],
      options: MakeOdmSeeder.options || {},
    },
    {
      commandName: OdmSeed.commandName,
      description: OdmSeed.description,
      namespace: null,
      aliases: OdmSeed.aliases || [],
      flags: [],
      args: [],
      options: OdmSeed.options || {},
    },
  ]
}

/**
 * Returns the command class for the given metadata
 */
export async function getCommand(metaData: CommandMetaData): Promise<typeof BaseCommand | null> {
  if (metaData.commandName === MakeOdmModel.commandName) {
    return MakeOdmModel
  }
  if (metaData.commandName === MakeOdmSeeder.commandName) {
    return MakeOdmSeeder
  }
  if (metaData.commandName === OdmSeed.commandName) {
    return OdmSeed
  }
  return null
}
