import { test } from 'node:test'
import assert from 'node:assert'
import { BaseModel } from '../src/base_model/base_model.js'
import { column } from '../src/decorators/column.js'
import { Decimal128 } from 'mongodb'

test('decimal column serialization and deserialization', () => {
  class TestModel extends BaseModel {
    static tableName = 'test_models'

    @column({ isPrimary: true })
    declare _id: string

    @column.decimal()
    declare earnings: number

    @column()
    declare name: string
  }

  // Test model metadata
  const metadata = TestModel.getMetadata()
  assert.ok(metadata, 'Model should have metadata')
  assert.ok(metadata.columns.has('earnings'), 'Should have earnings column')

  // Test decimal column options
  const earningsColumn = metadata.columns.get('earnings')
  assert.ok(earningsColumn?.serialize, 'Earnings column should have serialize function')
  assert.ok(earningsColumn?.deserialize, 'Earnings column should have deserialize function')

  // Test model instance creation
  const model = new TestModel()
  model.name = 'Test User'
  model.earnings = 100.99

  // Test that the value is stored correctly
  assert.equal(model.earnings, 100.99, 'Earnings should be stored as number')

  // Test serialization to document (for MongoDB storage)
  const document = model.toDocument()
  assert.ok(document.earnings instanceof Decimal128, 'Earnings should be serialized to Decimal128')
  assert.equal(document.earnings.toString(), '100.99', 'Decimal128 should contain correct value')

  // Test JSON serialization (for API responses)
  const json = model.toJSON()
  assert.equal(typeof json.earnings, 'number', 'Earnings should be serialized to number in JSON')
  assert.equal(json.earnings, 100.99, 'JSON earnings should have correct value')
})

test('decimal column handles MongoDB decimal objects', () => {
  class TestModel extends BaseModel {
    static tableName = 'test_models'

    @column({ isPrimary: true })
    declare _id: string

    @column.decimal()
    declare price: number
  }

  const model = new TestModel()

  // Simulate data coming from MongoDB with $numberDecimal format
  const mongoDecimalData = {
    _id: '507f1f77bcf86cd799439011',
    price: { $numberDecimal: '99.95' },
  }

  // Test hydration from MongoDB document
  model.hydrateFromDocument(mongoDecimalData as any)

  // The price should be deserialized to a number
  assert.equal(typeof model.price, 'number', 'Price should be deserialized to number')
  assert.equal(model.price, 99.95, 'Price should have correct value')

  // Test JSON serialization
  const json = model.toJSON()
  assert.equal(json.price, 99.95, 'JSON price should be correct number')
})

test('decimal column handles Decimal128 objects', () => {
  class TestModel extends BaseModel {
    static tableName = 'test_models'

    @column({ isPrimary: true })
    declare _id: string

    @column.decimal()
    declare amount: number
  }

  const model = new TestModel()

  // Simulate data coming from MongoDB with Decimal128
  const decimal128Value = Decimal128.fromString('123.45')
  const mongoData = {
    _id: '507f1f77bcf86cd799439011',
    amount: decimal128Value,
  }

  // Test hydration from MongoDB document
  model.hydrateFromDocument(mongoData as any)

  // The amount should be deserialized to a number
  assert.equal(typeof model.amount, 'number', 'Amount should be deserialized to number')
  assert.equal(model.amount, 123.45, 'Amount should have correct value')

  // Test JSON serialization
  const json = model.toJSON()
  assert.equal(json.amount, 123.45, 'JSON amount should be correct number')
})

test('regular column without decimal decorator still works', () => {
  class TestModel extends BaseModel {
    static tableName = 'test_models'

    @column({ isPrimary: true })
    declare _id: string

    @column()
    declare regularNumber: number
  }

  const model = new TestModel()
  model.regularNumber = 42.5

  // Test that regular numbers work normally
  assert.equal(model.regularNumber, 42.5, 'Regular number should work normally')

  // Test JSON serialization
  const json = model.toJSON()
  // The naming strategy converts camelCase to snake_case for JSON
  assert.equal(json.regular_number, 42.5, 'JSON regular number should work normally')

  // Test document serialization
  const document = model.toDocument()
  // The naming strategy converts camelCase to snake_case for database too
  assert.equal(document.regular_number, 42.5, 'Document regular number should work normally')
})
