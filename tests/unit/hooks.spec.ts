import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { BaseModel } from '../../src/base_model/base_model.js'
import {
  column,
  beforeSave,
  afterSave,
  beforeCreate,
  afterCreate,
  beforeUpdate,
  afterUpdate,
  beforeDelete,
  afterDelete,
  beforeFind,
  afterFind,
  beforeFetch,
  afterFetch,
} from '../../src/decorators/column.js'

// Test model with various hooks
class TestUser extends BaseModel {
  // Override protected methods for testing
  public async performInsert(): Promise<void> {
    this._id = 'mock-id'
  }

  public async performUpdate(): Promise<void> {
    // Mock update operation
  }
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare status: string

  @column()
  declare credits: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Track hook executions for testing
  static hookExecutions: string[] = []

  @beforeSave()
  static beforeSaveHook(user: TestUser) {
    TestUser.hookExecutions.push('beforeSave')
    // Set default status if not provided
    if (!user.status) {
      user.status = 'active'
    }
  }

  @afterSave()
  static afterSaveHook(user: TestUser) {
    TestUser.hookExecutions.push('afterSave')
  }

  @beforeCreate()
  static beforeCreateHook(user: TestUser) {
    TestUser.hookExecutions.push('beforeCreate')
    // Set default credits for new users
    if (user.credits === undefined) {
      user.credits = 100
    }
  }

  @afterCreate()
  static afterCreateHook(user: TestUser) {
    TestUser.hookExecutions.push('afterCreate')
  }

  @beforeUpdate()
  static beforeUpdateHook(user: TestUser) {
    TestUser.hookExecutions.push('beforeUpdate')
  }

  @afterUpdate()
  static afterUpdateHook(user: TestUser) {
    TestUser.hookExecutions.push('afterUpdate')
  }

  @beforeDelete()
  static beforeDeleteHook(user: TestUser) {
    TestUser.hookExecutions.push('beforeDelete')
  }

  @afterDelete()
  static afterDeleteHook(user: TestUser) {
    TestUser.hookExecutions.push('afterDelete')
  }

  @beforeFind()
  static beforeFindHook(query: any) {
    TestUser.hookExecutions.push('beforeFind')
    // Add a default filter to only show active users
    query.where('status', 'active')
  }

  @afterFind()
  static afterFindHook(user: TestUser | null) {
    TestUser.hookExecutions.push('afterFind')
  }

  @beforeFetch()
  static beforeFetchHook(query: any) {
    TestUser.hookExecutions.push('beforeFetch')
  }

  @afterFetch()
  static afterFetchHook(users: TestUser[]) {
    TestUser.hookExecutions.push('afterFetch')
  }

  static getCollectionName(): string {
    return 'test_users'
  }

  static clearHookExecutions() {
    TestUser.hookExecutions = []
  }
}

// Test model that aborts operations in hooks
class TestUserWithAbort extends BaseModel {
  static insertCalled = false

  // Override protected methods for testing
  public async performInsert(): Promise<void> {
    TestUserWithAbort.insertCalled = true
    this._id = 'mock-id'
  }

  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare shouldAbort: boolean

  static hookExecutions: string[] = []

  @beforeSave()
  static beforeSaveHook(user: TestUserWithAbort) {
    TestUserWithAbort.hookExecutions.push('beforeSave')
    if (user.shouldAbort) {
      return false // Abort the operation
    }
  }

  @beforeDelete()
  static beforeDeleteHook(user: TestUserWithAbort) {
    TestUserWithAbort.hookExecutions.push('beforeDelete')
    if (user.shouldAbort) {
      return false // Abort the operation
    }
  }

  static getCollectionName(): string {
    return 'test_users_with_abort'
  }

  static clearHookExecutions() {
    TestUserWithAbort.hookExecutions = []
  }
}

test.group('Model Hooks', () => {
  test('should register hooks in model metadata', async ({ assert }) => {
    const metadata = TestUser.getMetadata()

    assert.isTrue(metadata.hooks instanceof Map)
    assert.isTrue(metadata.hooks!.has('beforeSave'))
    assert.isTrue(metadata.hooks!.has('afterSave'))
    assert.isTrue(metadata.hooks!.has('beforeCreate'))
    assert.isTrue(metadata.hooks!.has('afterCreate'))
    assert.isTrue(metadata.hooks!.has('beforeUpdate'))
    assert.isTrue(metadata.hooks!.has('afterUpdate'))
    assert.isTrue(metadata.hooks!.has('beforeDelete'))
    assert.isTrue(metadata.hooks!.has('afterDelete'))
    assert.isTrue(metadata.hooks!.has('beforeFind'))
    assert.isTrue(metadata.hooks!.has('afterFind'))
    assert.isTrue(metadata.hooks!.has('beforeFetch'))
    assert.isTrue(metadata.hooks!.has('afterFetch'))

    // Check that hook method names are registered
    assert.deepEqual(metadata.hooks!.get('beforeSave'), ['beforeSaveHook'])
    assert.deepEqual(metadata.hooks!.get('afterSave'), ['afterSaveHook'])
    assert.deepEqual(metadata.hooks!.get('beforeCreate'), ['beforeCreateHook'])
    assert.deepEqual(metadata.hooks!.get('afterCreate'), ['afterCreateHook'])
  })

  test('should execute beforeSave and afterSave hooks on save', async ({ assert }) => {
    TestUser.clearHookExecutions()

    const user = new TestUser({
      name: 'John Doe',
      email: 'john@example.com',
    })

    // Database operations are mocked via overridden methods

    await user.save()

    assert.include(TestUser.hookExecutions, 'beforeSave')
    assert.include(TestUser.hookExecutions, 'afterSave')

    // Check that beforeSave hook set default status
    assert.equal(user.status, 'active')
  })

  test('should execute beforeCreate and afterCreate hooks for new models', async ({ assert }) => {
    TestUser.clearHookExecutions()

    const user = new TestUser({
      name: 'Jane Doe',
      email: 'jane@example.com',
    })

    // Database operations are mocked via overridden methods

    await user.save()

    assert.include(TestUser.hookExecutions, 'beforeCreate')
    assert.include(TestUser.hookExecutions, 'afterCreate')

    // Check that beforeCreate hook set default credits
    assert.equal(user.credits, 100)
  })

  test('should execute beforeUpdate and afterUpdate hooks for existing models', async ({
    assert,
  }) => {
    TestUser.clearHookExecutions()

    const user = new TestUser({
      name: 'John Updated',
      email: 'john.updated@example.com',
    })

    // Mark as persisted to simulate existing model
    user.$isPersisted = true
    user._id = 'existing-id'

    // Database operations are mocked via overridden methods

    await user.save()

    assert.include(TestUser.hookExecutions, 'beforeUpdate')
    assert.include(TestUser.hookExecutions, 'afterUpdate')
    assert.notInclude(TestUser.hookExecutions, 'beforeCreate')
    assert.notInclude(TestUser.hookExecutions, 'afterCreate')
  })

  test('should execute beforeDelete and afterDelete hooks on delete', async ({ assert }) => {
    TestUser.clearHookExecutions()

    const user = new TestUser({
      name: 'To Delete',
      email: 'delete@example.com',
    })

    user.$isPersisted = true
    user._id = 'to-delete-id'

    // Mock the query builder and delete operation
    const mockQueryBuilder = {
      where: () => mockQueryBuilder,
      delete: async () => 1, // Return 1 to indicate successful deletion
    }

    TestUser.query = () => mockQueryBuilder as any

    await user.delete()

    assert.include(TestUser.hookExecutions, 'beforeDelete')
    assert.include(TestUser.hookExecutions, 'afterDelete')
  })

  test('should abort save operation when beforeSave hook returns false', async ({ assert }) => {
    TestUserWithAbort.clearHookExecutions()

    const user = new TestUserWithAbort({
      name: 'Should Abort',
      shouldAbort: true,
    })

    // Database operations are mocked via overridden methods
    TestUserWithAbort.insertCalled = false

    await user.save()

    assert.include(TestUserWithAbort.hookExecutions, 'beforeSave')
    assert.isFalse(TestUserWithAbort.insertCalled) // Insert should not have been called
    assert.isFalse(user.$isPersisted) // Model should not be marked as persisted
  })

  test('should abort delete operation when beforeDelete hook returns false', async ({ assert }) => {
    TestUserWithAbort.clearHookExecutions()

    const user = new TestUserWithAbort({
      name: 'Should Abort Delete',
      shouldAbort: true,
    })

    user.$isPersisted = true
    user._id = 'to-abort-delete-id'

    // Mock the query builder
    let deleteCalled = false
    const mockQueryBuilder = {
      where: () => mockQueryBuilder,
      delete: async () => {
        deleteCalled = true
        return 1
      },
    }

    TestUserWithAbort.query = () => mockQueryBuilder as any

    const result = await user.delete()

    assert.include(TestUserWithAbort.hookExecutions, 'beforeDelete')
    assert.isFalse(deleteCalled) // Delete should not have been called
    assert.isFalse(result) // Delete should return false
    assert.isTrue(user.$isPersisted) // Model should still be marked as persisted
  })

  test('should execute hooks in correct order for save operation', async ({ assert }) => {
    TestUser.clearHookExecutions()

    const user = new TestUser({
      name: 'Order Test',
      email: 'order@example.com',
    })

    // Mock the database operations
    user.performInsert = async function () {
      this._id = 'mock-id'
    }

    await user.save()

    const expectedOrder = ['beforeSave', 'beforeCreate', 'afterSave', 'afterCreate']
    const actualOrder = TestUser.hookExecutions

    // Check that hooks were executed in the correct order
    let lastIndex = -1
    for (const hook of expectedOrder) {
      const index = actualOrder.indexOf(hook)
      assert.isTrue(index > lastIndex, `Hook ${hook} should come after previous hooks`)
      lastIndex = index
    }
  })

  test('should allow hooks to modify model data', async ({ assert }) => {
    TestUser.clearHookExecutions()

    const user = new TestUser({
      name: 'Modify Test',
      email: 'modify@example.com',
      // Don't set status or credits to test hook modifications
    })

    // Mock the database operations
    user.performInsert = async function () {
      this._id = 'mock-id'
    }

    await user.save()

    // Check that hooks modified the data
    assert.equal(user.status, 'active') // Set by beforeSave hook
    assert.equal(user.credits, 100) // Set by beforeCreate hook
  })

  test('should handle async hooks correctly', async ({ assert }) => {
    class AsyncHookUser extends BaseModel {
      // Override protected methods for testing
      public async performInsert(): Promise<void> {
        this._id = 'mock-id'
      }

      @column({ isPrimary: true })
      declare _id: string

      @column()
      declare name: string

      static hookExecutions: string[] = []

      @beforeSave()
      static async asyncBeforeSave(user: AsyncHookUser) {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10))
        AsyncHookUser.hookExecutions.push('asyncBeforeSave')
      }

      @afterSave()
      static async asyncAfterSave(user: AsyncHookUser) {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10))
        AsyncHookUser.hookExecutions.push('asyncAfterSave')
      }

      static getCollectionName(): string {
        return 'async_hook_users'
      }
    }

    const user = new AsyncHookUser({
      name: 'Async Test',
    })

    // Database operations are mocked via overridden methods

    await user.save()

    assert.include(AsyncHookUser.hookExecutions, 'asyncBeforeSave')
    assert.include(AsyncHookUser.hookExecutions, 'asyncAfterSave')
  })
})
