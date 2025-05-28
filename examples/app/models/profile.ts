import { BaseModel } from '../../src/base_model/base_model.js'
import { column } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import { belongsTo, type BelongsTo } from '../../src/types/relationships.js'
import UserWithReferencedProfile from './user_with_referenced_profile.js'

export default class Profile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare bio?: string

  @column()
  declare age: number

  @column()
  declare avatar?: string

  @column()
  declare phoneNumber?: string

  @column()
  declare address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }

  @column()
  declare socialLinks?: {
    twitter?: string
    linkedin?: string
    github?: string
    website?: string
  }

  @column()
  declare userId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => UserWithReferencedProfile)
  declare user: BelongsTo<typeof UserWithReferencedProfile>

  /**
   * Get full name
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  /**
   * Get formatted address
   */
  get formattedAddress(): string | null {
    if (!this.address) return null

    const { street, city, state, zipCode, country } = this.address
    return `${street}, ${city}, ${state} ${zipCode}, ${country}`
  }
}
