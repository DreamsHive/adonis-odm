import { BaseModel } from '../../src/base_model/base_model.js'
import { column, belongsTo } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import UserWithReferencedProfile from './user_with_referenced_profile.js'
import type { BelongsTo } from '../../src/types/relationships.js'

/**
 * Post model that belongs to a user
 */
export default class Post extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare title: string

  @column()
  declare content: string

  @column()
  declare status: 'draft' | 'published' | 'archived'

  @column()
  declare tags?: string[]

  @column()
  declare authorId: string

  // BelongsTo relationship with User
  @belongsTo(() => UserWithReferencedProfile, {
    localKey: 'authorId',
    foreignKey: '_id',
  })
  declare author: BelongsTo<typeof UserWithReferencedProfile>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Get excerpt from content
   */
  get excerpt(): string {
    return this.content.length > 100 ? this.content.substring(0, 100) + '...' : this.content
  }

  /**
   * Check if post is published
   */
  get isPublished(): boolean {
    return this.status === 'published'
  }
}
