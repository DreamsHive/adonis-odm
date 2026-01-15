import { test } from 'node:test'
import assert from 'node:assert'
import { BaseModel } from '../src/base_model/base_model.js'
import { column } from '../src/decorators/column.js'
import { ModelQueryBuilder } from '../src/query_builder/model_query_builder.js'
import type { Collection } from 'mongodb'

/**
 * Mock MongoDB collection that captures filter queries
 */
interface MockCollection extends Collection<any> {
  getCapturedFilters(): any[]
  clearCapturedFilters(): void
}

function createMockCollection(): MockCollection {
  let capturedFilters: any[] = []

  const mockCollection: any = {
    findOne: async (filter: any) => {
      capturedFilters.push(filter)
      return null
    },
    find: (filter: any) => {
      capturedFilters.push(filter)
      return {
        toArray: async () => [],
        limit: function (n: number) {
          return this
        },
        skip: function (n: number) {
          return this
        },
        sort: function (sort: any) {
          return this
        },
      }
    },
    countDocuments: async (filter: any) => {
      capturedFilters.push(filter)
      return 0
    },
    updateMany: async (filter: any) => {
      capturedFilters.push(filter)
      return { modifiedCount: 0 }
    },
    deleteMany: async (filter: any) => {
      capturedFilters.push(filter)
      return { deletedCount: 0 }
    },
    distinct: async (field: string, filter: any) => {
      capturedFilters.push(filter)
      return []
    },
    getCapturedFilters: () => capturedFilters,
    clearCapturedFilters: () => {
      capturedFilters = []
    },
  }

  return mockCollection as MockCollection
}

/**
 * Override BaseModel.query to use mocked collection
 */
function setupMockQuery(modelClass: typeof BaseModel, mockCollection: MockCollection) {
  const originalQuery = modelClass.query
  modelClass.query = function <T extends BaseModel = BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T)
  ) {
    return new ModelQueryBuilder(mockCollection, this as any) as any
  }
  return () => {
    modelClass.query = originalQuery
  }
}

class User extends BaseModel {
  static tableName = 'users'

  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare emailAddress: string
}

class Product extends BaseModel {
  static tableName = 'products'

  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare productName: string

  @column()
  declare unitPrice: number
}

class Order extends BaseModel {
  static tableName = 'orders'

  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare orderStatus: string

  @column()
  declare totalAmount: number

  @column()
  declare customerEmail: string
}

class Profile extends BaseModel {
  static tableName = 'profiles'

  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare deletedAt?: Date

  @column()
  declare emailVerifiedAt?: Date
}

class Transaction extends BaseModel {
  static tableName = 'transactions'

  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare transactionAmount: number
}

class Document extends BaseModel {
  static tableName = 'documents'

  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare filePath?: string

  @column()
  declare thumbnailPath?: string
}

test('query builder should convert camelCase field names to snake_case in where conditions', async () => {
  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(User, mockCollection)

  try {
    // Build query with camelCase field names
    await User.query().where('firstName', 'John').first()

    const filters = mockCollection.getCapturedFilters()
    assert.equal(filters.length, 1, 'Should capture one filter query')

    const filter = filters[0]
    assert.ok('first_name' in filter, 'Should have first_name (snake_case) in filter')
    assert.ok(!('firstName' in filter), 'Should NOT have firstName (camelCase) in filter')
    assert.equal(filter.first_name, 'John', 'Should have correct value')
  } finally {
    restoreQuery()
  }
})

test('query builder should convert camelCase in where with operator', async () => {
  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(Product, mockCollection)

  try {
    await Product.query().where('unitPrice', '>', 100).first()

    const filters = mockCollection.getCapturedFilters()
    const filter = filters[0]

    assert.ok('unit_price' in filter, 'Should have unit_price (snake_case) in filter')
    assert.ok(!('unitPrice' in filter), 'Should NOT have unitPrice (camelCase) in filter')
    assert.deepEqual(filter.unit_price, { $gt: 100 }, 'Should have correct operator and value')
  } finally {
    restoreQuery()
  }
})

test('query builder should convert camelCase in whereIn', async () => {
  class OrderStatus extends BaseModel {
    static tableName = 'orders'

    @column({ isPrimary: true })
    declare _id: string

    @column()
    declare orderStatus: string
  }

  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(OrderStatus, mockCollection)

  try {
    await OrderStatus.query().whereIn('orderStatus', ['pending', 'completed']).first()

    const filters = mockCollection.getCapturedFilters()
    const filter = filters[0]

    assert.ok('order_status' in filter, 'Should have order_status (snake_case) in filter')
    assert.ok(!('orderStatus' in filter), 'Should NOT have orderStatus (camelCase) in filter')
    assert.deepEqual(
      filter.order_status,
      { $in: ['pending', 'completed'] },
      'Should have correct $in condition'
    )
  } finally {
    restoreQuery()
  }
})

test('query builder should convert camelCase in whereNull and whereNotNull', async () => {
  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(Profile, mockCollection)

  try {
    await Profile.query().whereNull('deletedAt').whereNotNull('emailVerifiedAt').first()

    const filters = mockCollection.getCapturedFilters()
    const filter = filters[0]

    assert.ok('deleted_at' in filter, 'Should have deleted_at (snake_case) in filter')
    assert.ok('email_verified_at' in filter, 'Should have email_verified_at (snake_case) in filter')
    assert.equal(filter.deleted_at, null, 'deleted_at should be null')
    assert.deepEqual(
      filter.email_verified_at,
      { $ne: null },
      'email_verified_at should have $ne: null'
    )
  } finally {
    restoreQuery()
  }
})

test('query builder should convert camelCase in whereBetween', async () => {
  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(Transaction, mockCollection)

  try {
    await Transaction.query().whereBetween('transactionAmount', [10, 100]).first()

    const filters = mockCollection.getCapturedFilters()
    const filter = filters[0]

    assert.ok(
      'transaction_amount' in filter,
      'Should have transaction_amount (snake_case) in filter'
    )
    assert.ok(
      !('transactionAmount' in filter),
      'Should NOT have transactionAmount (camelCase) in filter'
    )
    assert.deepEqual(
      filter.transaction_amount,
      { $gte: 10, $lte: 100 },
      'Should have correct between condition'
    )
  } finally {
    restoreQuery()
  }
})

test('query builder should convert camelCase in orWhere conditions', async () => {
  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(User, mockCollection)

  try {
    await User.query().where('firstName', 'John').orWhere('lastName', 'Doe').first()

    const filters = mockCollection.getCapturedFilters()
    const filter = filters[0]

    // OR conditions should be in $or array
    assert.ok('$or' in filter, 'Should have $or in filter')
    assert.ok(Array.isArray(filter.$or), '$or should be an array')

    // Check that field names are converted
    const orConditions = filter.$or
    const hasFirstName = orConditions.some((cond: any) => 'first_name' in cond)
    const hasLastName = orConditions.some((cond: any) => 'last_name' in cond)

    assert.ok(hasFirstName, 'Should have first_name in OR conditions')
    assert.ok(hasLastName, 'Should have last_name in OR conditions')
  } finally {
    restoreQuery()
  }
})

test('query builder should preserve _id field name (no conversion)', async () => {
  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(User, mockCollection)

  try {
    await User.query().where('_id', '507f1f77bcf86cd799439011').first()

    const filters = mockCollection.getCapturedFilters()
    const filter = filters[0]

    assert.ok('_id' in filter, 'Should preserve _id field name')
  } finally {
    restoreQuery()
  }
})

test('query builder should convert camelCase in complex queries with multiple conditions', async () => {
  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(Order, mockCollection)

  try {
    await Order.query()
      .where('orderStatus', 'completed')
      .where('totalAmount', '>', 100)
      .whereIn('orderStatus', ['pending', 'processing'])
      .whereNotNull('customerEmail')
      .first()

    const filters = mockCollection.getCapturedFilters()
    const filter = filters[0]

    // Verify all field names are converted
    assert.ok('order_status' in filter, 'Should have order_status')
    assert.ok('total_amount' in filter, 'Should have total_amount')
    assert.ok('customer_email' in filter, 'Should have customer_email')

    // Verify camelCase is not present
    assert.ok(!('orderStatus' in filter), 'Should NOT have orderStatus')
    assert.ok(!('totalAmount' in filter), 'Should NOT have totalAmount')
    assert.ok(!('customerEmail' in filter), 'Should NOT have customerEmail')
  } finally {
    restoreQuery()
  }
})

test('query builder should convert camelCase in updateOrCreate search payload', async () => {
  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(User, mockCollection)

  try {
    // Simulate updateOrCreate by building a query with multiple where conditions
    await User.query().where('emailAddress', 'test@example.com').where('firstName', 'John').first()

    const filters = mockCollection.getCapturedFilters()
    const filter = filters[0]

    assert.ok('email_address' in filter, 'Should have email_address (snake_case)')
    assert.ok('first_name' in filter, 'Should have first_name (snake_case)')
    assert.equal(filter.email_address, 'test@example.com', 'Should have correct email value')
    assert.equal(filter.first_name, 'John', 'Should have correct firstName value')
  } finally {
    restoreQuery()
  }
})

test('query builder should handle snake_case field names (idempotent conversion)', async () => {
  class UserSnakeCase extends BaseModel {
    static tableName = 'users'

    @column({ isPrimary: true })
    declare _id: string

    @column()
    declare first_name: string // Already snake_case
  }

  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(UserSnakeCase, mockCollection)

  try {
    await UserSnakeCase.query().where('first_name', 'John').first()

    const filters = mockCollection.getCapturedFilters()
    const filter = filters[0]

    // Should still work correctly even if field is already snake_case
    assert.ok('first_name' in filter, 'Should have first_name in filter')
    assert.equal(filter.first_name, 'John', 'Should have correct value')
  } finally {
    restoreQuery()
  }
})

test('query builder should convert camelCase in whereExists and whereNotExists', async () => {
  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(Document, mockCollection)

  try {
    await Document.query().whereExists('filePath').whereNotExists('thumbnailPath').first()

    const filters = mockCollection.getCapturedFilters()
    const filter = filters[0]

    assert.ok('file_path' in filter, 'Should have file_path (snake_case)')
    assert.ok('thumbnail_path' in filter, 'Should have thumbnail_path (snake_case)')
    assert.deepEqual(filter.file_path, { $exists: true }, 'file_path should have $exists: true')
    assert.deepEqual(
      filter.thumbnail_path,
      { $exists: false },
      'thumbnail_path should have $exists: false'
    )
  } finally {
    restoreQuery()
  }
})

class UserWithFullName extends BaseModel {
  static tableName = 'users'

  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare fullName: string
}

test('query builder should convert camelCase in whereLike and whereILike', async () => {
  const mockCollection = createMockCollection()
  const restoreQuery = setupMockQuery(UserWithFullName, mockCollection)

  try {
    await UserWithFullName.query().whereLike('fullName', 'John%').first()

    const filters = mockCollection.getCapturedFilters()
    const filter = filters[0]

    assert.ok('full_name' in filter, 'Should have full_name (snake_case)')
    assert.ok(!('fullName' in filter), 'Should NOT have fullName (camelCase)')
    assert.ok(filter.full_name instanceof RegExp, 'Should have RegExp for like query')
  } finally {
    restoreQuery()
  }
})
