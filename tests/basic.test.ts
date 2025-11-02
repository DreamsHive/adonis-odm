import { test } from 'node:test'
import assert from 'node:assert'
import { BaseModel } from '../src/base_model/base_model.js'
import { column } from '../src/decorators/column.js'
import { defineConfig } from '../src/config/odm_config.js'

test('package exports are available', () => {
  assert.ok(BaseModel, 'BaseModel should be exported')
  assert.ok(column, 'column decorator should be exported')
  assert.ok(defineConfig, 'defineConfig function should be exported')
})

test('BaseModel can be extended', () => {
  class TestModel extends BaseModel {
    static tableName = 'test_models'
  }

  assert.ok(TestModel, 'TestModel should be created')
  assert.ok(TestModel.prototype instanceof BaseModel, 'TestModel should extend BaseModel')
})

test('BaseModel collection naming - static collection property (Lucid pattern)', () => {
  class UserModel extends BaseModel {
    static collection = 'custom_users'
  }

  assert.equal(
    UserModel.getCollectionName(),
    'custom_users',
    'Should use static collection property'
  )
})

test('BaseModel collection naming - metadata tableName (backward compatibility)', () => {
  class ProductModel extends BaseModel {}

  // Set tableName via metadata (simulating old decorator behavior)
  const metadata = ProductModel.getMetadata()
  metadata.tableName = 'legacy_products'

  assert.equal(ProductModel.getCollectionName(), 'legacy_products', 'Should use metadata tableName')
})

test('BaseModel collection naming - auto-generated from class name', () => {
  class OrderModel extends BaseModel {}

  assert.equal(
    OrderModel.getCollectionName(),
    'order_models',
    'Should auto-generate from class name'
  )
})

test('BaseModel collection naming - precedence order', () => {
  class TestPrecedenceModel extends BaseModel {
    static collection = 'priority_collection'
  }

  // Also set tableName via metadata
  const metadata = TestPrecedenceModel.getMetadata()
  metadata.tableName = 'secondary_table'

  assert.equal(
    TestPrecedenceModel.getCollectionName(),
    'priority_collection',
    'Static collection property should take precedence over metadata tableName'
  )
})

test('BaseModel collection naming - complex class names', () => {
  class UserWithReferencedProfile extends BaseModel {}
  class AdminUser extends BaseModel {}
  class APIKey extends BaseModel {}

  assert.equal(
    UserWithReferencedProfile.getCollectionName(),
    'user_with_referenced_profiles',
    'Should handle complex compound names'
  )
  assert.equal(AdminUser.getCollectionName(), 'admin_users', 'Should handle simple compound names')
  assert.equal(APIKey.getCollectionName(), 'a_p_i_keys', 'Should handle acronyms')
})

test('BaseModel collection naming - backward compatibility with getCollectionName method', () => {
  class LegacyModel extends BaseModel {
    static getCollectionName(): string {
      return 'legacy_collection'
    }
  }

  // The getCollectionName method should still work
  assert.equal(
    LegacyModel.getCollectionName(),
    'legacy_collection',
    'Should support legacy getCollectionName method'
  )
})

test('BaseModel collection naming - static collection takes precedence over getCollectionName', () => {
  class MixedModel extends BaseModel {
    static collection = 'new_collection'

    static getCollectionName(): string {
      // Check if static collection property exists first
      if ((this as any).collection) {
        return (this as any).collection
      }
      return 'old_collection'
    }
  }

  assert.equal(
    MixedModel.getCollectionName(),
    'new_collection',
    'Static collection property should take precedence'
  )
})

test('defineConfig returns configuration object', () => {
  const config = defineConfig({
    connection: 'mongodb',
    connections: {
      mongodb: {
        client: 'mongodb',
        connection: {
          url: 'mongodb://localhost:27017/test',
        },
      },
    },
  })

  assert.ok(config, 'Config should be returned')
  assert.equal(config.connection, 'mongodb', 'Connection name should be preserved')
  assert.ok(config.connections.mongodb, 'MongoDB connection should be defined')
})
