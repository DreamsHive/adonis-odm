import { test } from 'node:test'
import assert from 'node:assert'
import { BaseModel } from '../src/base_model/base_model.js'
import { column } from '../src/decorators/column.js'
import { Decimal128 } from 'mongodb'

test('dirty attributes should use database column names (snake_case)', () => {
  class Affiliate extends BaseModel {
    static tableName = 'affiliates'

    @column({ isPrimary: true })
    declare _id: string

    @column()
    declare code: string

    @column()
    declare wallet: string

    @column()
    declare username?: string

    @column.decimal()
    declare totalEarning: number

    @column.dateTime({ autoCreate: true })
    declare createdAt: Date

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: Date
  }

  // Create a new affiliate instance
  const affiliate = new Affiliate({
    code: 'TEST123',
    wallet: '0x123456789',
    username: 'testuser',
    totalEarning: 10.5,
  })

  // Mark as persisted to simulate an existing record
  affiliate.$isPersisted = true
  affiliate.$isLocal = false
  affiliate.$dirty = {} // Clear initial dirty state

  // Modify the totalEarning property (this is what happens in the user's code)
  affiliate.totalEarning += 0.1

  // Get dirty attributes - this should return database column names
  const dirtyAttributes = affiliate.getDirtyAttributes()

  // Verify that the dirty attributes use snake_case database column names
  assert.ok(
    'total_earning' in dirtyAttributes,
    'Should have total_earning (snake_case) in dirty attributes'
  )
  assert.ok(
    !('totalEarning' in dirtyAttributes),
    'Should NOT have totalEarning (camelCase) in dirty attributes'
  )

  // Verify the value is correctly serialized for decimal columns
  assert.ok(
    dirtyAttributes.total_earning instanceof Decimal128,
    'total_earning should be serialized as Decimal128'
  )
  assert.equal(
    dirtyAttributes.total_earning.toString(),
    '10.6',
    'Decimal128 should contain correct value'
  )

  // Verify other properties are not in dirty attributes
  assert.equal(Object.keys(dirtyAttributes).length, 1, 'Should only have one dirty attribute')
})

test('dirty attributes should handle multiple property changes with naming strategy', () => {
  class TestModel extends BaseModel {
    static tableName = 'test_models'

    @column({ isPrimary: true })
    declare _id: string

    @column()
    declare firstName: string

    @column()
    declare lastName: string

    @column()
    declare emailAddress: string

    @column.decimal()
    declare accountBalance: number

    @column()
    declare isActive: boolean
  }

  // Create and mark as persisted
  const model = new TestModel({
    firstName: 'John',
    lastName: 'Doe',
    emailAddress: 'john@example.com',
    accountBalance: 100.0,
    isActive: true,
  })

  model.$isPersisted = true
  model.$isLocal = false
  model.$dirty = {} // Clear initial dirty state

  // Modify multiple properties
  model.firstName = 'Jane'
  model.emailAddress = 'jane@example.com'
  model.accountBalance += 50.25

  // Get dirty attributes
  const dirtyAttributes = model.getDirtyAttributes()

  // Verify all dirty attributes use snake_case
  assert.ok('first_name' in dirtyAttributes, 'Should have first_name in dirty attributes')
  assert.ok('email_address' in dirtyAttributes, 'Should have email_address in dirty attributes')
  assert.ok('account_balance' in dirtyAttributes, 'Should have account_balance in dirty attributes')

  // Verify camelCase properties are NOT present
  assert.ok(!('firstName' in dirtyAttributes), 'Should NOT have firstName in dirty attributes')
  assert.ok(
    !('emailAddress' in dirtyAttributes),
    'Should NOT have emailAddress in dirty attributes'
  )
  assert.ok(
    !('accountBalance' in dirtyAttributes),
    'Should NOT have accountBalance in dirty attributes'
  )

  // Verify values are correct
  assert.equal(dirtyAttributes.first_name, 'Jane', 'first_name should have correct value')
  assert.equal(
    dirtyAttributes.email_address,
    'jane@example.com',
    'email_address should have correct value'
  )
  assert.ok(
    dirtyAttributes.account_balance instanceof Decimal128,
    'account_balance should be Decimal128'
  )
  assert.equal(
    dirtyAttributes.account_balance.toString(),
    '150.25',
    'account_balance should have correct value'
  )

  // Verify unchanged properties are not in dirty attributes
  assert.ok(!('last_name' in dirtyAttributes), 'Should NOT have last_name in dirty attributes')
  assert.ok(!('is_active' in dirtyAttributes), 'Should NOT have is_active in dirty attributes')

  assert.equal(Object.keys(dirtyAttributes).length, 3, 'Should have exactly 3 dirty attributes')
})

test('dirty attributes should skip computed and reference properties', () => {
  class TestModel extends BaseModel {
    static tableName = 'test_models'

    @column({ isPrimary: true })
    declare _id: string

    @column()
    declare firstName: string

    @column({ isReference: true })
    declare virtualProperty: string

    @column({ isComputed: true })
    declare computedProperty: string
  }

  const model = new TestModel({ firstName: 'John' })
  model.$isPersisted = true
  model.$isLocal = false

  // Manually add computed and reference properties to dirty (this shouldn't happen in practice)
  model.$dirty = {
    firstName: 'Jane',
    virtualProperty: 'virtual',
    computedProperty: 'computed',
  }

  const dirtyAttributes = model.getDirtyAttributes()

  // Should only include regular columns, not reference or computed
  assert.ok('first_name' in dirtyAttributes, 'Should have first_name in dirty attributes')
  assert.ok(
    !('virtual_property' in dirtyAttributes),
    'Should NOT have virtual_property in dirty attributes'
  )
  assert.ok(
    !('computed_property' in dirtyAttributes),
    'Should NOT have computed_property in dirty attributes'
  )

  assert.equal(Object.keys(dirtyAttributes).length, 1, 'Should only have one dirty attribute')
  assert.equal(dirtyAttributes.first_name, 'Jane', 'first_name should have correct value')
})
