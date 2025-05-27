import { BaseModel } from '../../src/base_model/base_model.js'
import { column, hasOne, computed, beforeSave } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
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
  declare email: string

  @column()
  declare age: number

  @column({ serializeAs: null })
  declare encryptedPassword: string

  // Lucid-style hasOne decorator - automatically registers models and creates relationship
  @hasOne(() => Profile, {
    localKey: '_id',
    foreignKey: 'userId',
  })
  declare profile: HasOne<typeof Profile>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Get full name from loaded profile
   * Will be serialized as 'full_name' in JSON due to naming strategy
   */
  @computed()
  get fullName() {
    return this.profile?.fullName ?? ''
  }

  /**
   * Get formatted address from loaded profile
   * Will be serialized as 'formatted_address' in JSON due to naming strategy
   */
  @computed()
  get formattedAddress() {
    return this.profile?.formattedAddress ?? ''
  }

  @beforeSave()
  static async hashPassword(user: UserWithReferencedProfile) {
    if (user.$dirty.encryptedPassword) {
      user.encryptedPassword = await hash.make(user.encryptedPassword)
    }
  }
}
