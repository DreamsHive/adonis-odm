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
