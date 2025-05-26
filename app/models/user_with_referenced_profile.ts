import { BaseModel } from '../../src/base_model/base_model.js'
import { column } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import { ObjectId } from 'mongodb'
import Profile from './profile.js'

/**
 * User model with referenced profile
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

  // Reference to profile document
  @column()
  declare profileId?: ObjectId | string

  // Virtual property for loaded profile
  declare profile?: Profile

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Load the associated profile
   */
  async loadProfile(): Promise<Profile | null> {
    if (!this.profileId) return null

    const profile = await Profile.find(this.profileId)
    this.profile = profile || undefined
    return profile
  }

  /**
   * Create and associate a new profile
   */
  async createProfile(profileData: Partial<Profile>): Promise<Profile> {
    const profile = await Profile.create(profileData)
    this.profileId = profile._id
    await this.save()
    this.profile = profile
    return profile
  }

  /**
   * Update the associated profile
   */
  async updateProfile(profileData: Partial<Profile>): Promise<Profile | null> {
    if (!this.profileId) return null

    const profile = await Profile.find(this.profileId)
    if (!profile) return null

    profile.merge(profileData)
    await profile.save()
    this.profile = profile
    return profile
  }

  /**
   * Delete the associated profile
   */
  async deleteProfile(): Promise<boolean> {
    if (!this.profileId) return false

    const profile = await Profile.find(this.profileId)
    if (!profile) return false

    const deleted = await profile.delete()
    if (deleted) {
      this.profileId = undefined
      await this.save()
      this.profile = undefined
    }

    return deleted
  }

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
