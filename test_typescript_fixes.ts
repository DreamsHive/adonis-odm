import { BaseModel } from './src/base_model/base_model.js'
import { column, hasOne, hasMany, belongsTo } from './src/decorators/column.js'
import { DateTime } from 'luxon'
import type { HasOne, HasMany, BelongsTo } from './src/types/relationships.js'

// Test models
class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @hasOne(() => Profile, {
    localKey: '_id',
    foreignKey: 'userId',
  })
  declare profile: HasOne<typeof Profile>

  @hasMany(() => Post, {
    localKey: '_id',
    foreignKey: 'authorId',
  })
  declare posts: HasMany<typeof Post>

  static getCollectionName(): string {
    return 'users'
  }
}

class Profile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare userId: string

  @belongsTo(() => User, {
    localKey: 'userId',
    foreignKey: '_id',
  })
  declare user: BelongsTo<typeof User>

  static getCollectionName(): string {
    return 'profiles'
  }
}

class Post extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare title: string

  @column()
  declare authorId: string

  @belongsTo(() => User, {
    localKey: 'authorId',
    foreignKey: '_id',
  })
  declare author: BelongsTo<typeof User>

  static getCollectionName(): string {
    return 'posts'
  }
}

// Test the fixed TypeScript issues
async function testTypeSafety() {
  const user = new User()

  // These should now work without TypeScript errors:

  // HasOne relationship methods
  console.log(user.profile.isLoaded) // ✅ Should work
  await user.profile.load() // ✅ Should work
  const query1 = user.profile.query() // ✅ Should work

  // HasMany relationship methods
  console.log(user.posts.isLoaded) // ✅ Should work
  await user.posts.load() // ✅ Should work
  const query2 = user.posts.query() // ✅ Should work
  await user.posts.save(new Post()) // ✅ Should work

  // BelongsTo relationship methods
  const profile = new Profile()
  console.log(profile.user.isLoaded) // ✅ Should work
  await profile.user.load() // ✅ Should work
  const query3 = profile.user.query() // ✅ Should work

  // Direct property access (seamless like Lucid)
  // These should work after loading:
  await user.profile.load()
  console.log(user.profile.firstName) // ✅ Should work seamlessly

  await user.posts.load()
  console.log(user.posts[0]?.title) // ✅ Should work seamlessly
  console.log(user.posts.length) // ✅ Should work seamlessly

  await profile.user.load()
  console.log(profile.user.name) // ✅ Should work seamlessly
}

export { testTypeSafety, User, Profile, Post }
