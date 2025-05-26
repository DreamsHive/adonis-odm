import { BaseModel } from '../../src/base_model/base_model.js'
import { column, hasOne } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import { ObjectId } from 'mongodb'
import Profile from './profile.js'
import type { HasOne } from '../../src/types/relationships.js'

/**
 * User model with referenced profile using the new Lucid-style decorator
 * This approach stores the profile as a separate document and references it
 */
export default class UserWithReferencedProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  // Lucid-style hasOne decorator - automatically registers models and creates relationship
  @hasOne(() => Profile, {
    localKey: '_id',
    foreignKey: 'userId',
  })
  declare profile: HasOne<typeof Profile>

  // Actual field that stores the profile ID (for manual operations if needed)
  @column()
  declare profileId?: ObjectId | string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Get full name from loaded profile
   */
  get fullName(): string | null {
    return this.profile?.fullName || null
  }

  /**
   * Get formatted address from loaded profile
   */
  get formattedAddress(): string | null {
    return this.profile?.formattedAddress || null
  }
}
