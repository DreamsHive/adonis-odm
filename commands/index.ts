/**
 * AdonisJS MongoDB ODM Commands
 */

import type { CommandMetaData } from '@adonisjs/ace/types'
import type { BaseCommand } from '@adonisjs/core/ace'
import MakeOdmModel from './make_odm_model.js'

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
  ]
}

/**
 * Returns the command class for the given metadata
 */
export async function getCommand(metaData: CommandMetaData): Promise<typeof BaseCommand | null> {
  if (metaData.commandName === MakeOdmModel.commandName) {
    return MakeOdmModel
  }
  return null
}
