import { BaseModel } from '../../src/base_model/base_model.js'
import { column } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'

/**
 * User model with embedded profile
 * This approach stores the profile data directly within the user document
 */
export default class UserWithEmbeddedProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  // Embedded profile data
  @column.embedded()
  declare profile?: {
    firstName: string
    lastName: string
    bio?: string
    avatar?: string
    phoneNumber?: string
    address?: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
    socialLinks?: {
      twitter?: string
      linkedin?: string
      github?: string
      website?: string
    }
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Get full name from embedded profile
   */
  get fullName(): string | null {
    if (!this.profile) return null
    return `${this.profile.firstName} ${this.profile.lastName}`.trim()
  }

  /**
   * Update profile data
   */
  updateProfile(profileData: Partial<NonNullable<typeof this.profile>>): void {
    if (!this.profile) {
      this.profile = {} as NonNullable<typeof this.profile>
    }

    Object.assign(this.profile, profileData)
    this.setAttribute('profile', this.profile)
  }

  /**
   * Get formatted address from embedded profile
   */
  get formattedAddress(): string | null {
    if (!this.profile?.address) return null

    const { street, city, state, zipCode, country } = this.profile.address
    return `${street}, ${city}, ${state} ${zipCode}, ${country}`
  }
}
