import { BaseModel } from '../../src/base_model/base_model.js'
import { column } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import EmbeddedProfile from './embedded_profile.js'
import type { EmbeddedSingle, EmbeddedMany } from '../../src/types/embedded.js'

/**
 * User model with enhanced embedded profile using defined Profile model
 * This demonstrates the new enhanced embedded functionality with full CRUD operations
 * and complete type safety without any 'as any' casts
 */
export default class UserWithEnhancedEmbeddedProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  // Single embedded profile using the EmbeddedProfile model - fully type-safe
  @column.embedded(() => EmbeddedProfile, 'single')
  declare profile?: EmbeddedSingle<typeof EmbeddedProfile>

  // Multiple embedded profiles - fully type-safe
  @column.embedded(() => EmbeddedProfile, 'many')
  declare profiles?: EmbeddedMany<typeof EmbeddedProfile>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Get full name from embedded profile - type-safe access
   */
  get fullName(): string | null {
    if (!this.profile) return null
    return this.profile.fullName
  }

  /**
   * Get all profile names from embedded profiles array - type-safe access
   */
  get allProfileNames(): string[] {
    if (!this.profiles) return []
    return this.profiles.map((profile) => profile.fullName)
  }

  /**
   * Get profiles by bio keyword - type-safe querying
   */
  getProfilesByBio(keyword: string) {
    if (!this.profiles) return []
    return this.profiles.query().where('bio', 'like', keyword).get()
  }

  /**
   * Get young profiles - type-safe filtering
   */
  getYoungProfiles(maxAge: number = 30) {
    if (!this.profiles) return []
    return this.profiles.query().where('age', '<=', maxAge).orderBy('age', 'asc').get()
  }
}
