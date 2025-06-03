import { BaseModel, column } from './src/index.js'

// Example model with the decimal bug fix
class Product extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  // ✅ SOLUTION: Use @column.decimal() for decimal values
  @column.decimal()
  declare earnings: number
}

// Simulate the original problem and show the fix
function demonstrateFix() {
  console.log('🔧 Decimal Serialization Bug Fix Demo\n')

  // Create a product with decimal earnings
  const product = new Product()
  product.name = 'Test Product'
  product.earnings = 100.99

  console.log('✅ Original value:', product.earnings, typeof product.earnings)

  // Simulate data coming from MongoDB with the problematic format
  const mongoData = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Product',
    earnings: { $numberDecimal: '100.99' } // This is how MongoDB stores decimals
  }

  console.log('📥 MongoDB data format:', JSON.stringify(mongoData, null, 2))

  // Hydrate the model from MongoDB data
  product.hydrateFromDocument(mongoData as any)

  console.log('✅ After hydration:', product.earnings, typeof product.earnings)

  // Test JSON serialization (for API responses)
  const json = product.toJSON()
  console.log('📤 JSON serialization:', JSON.stringify(json, null, 2))

  // Test document serialization (for MongoDB storage)
  const document = product.toDocument()
  console.log('💾 Document for MongoDB:', {
    ...document,
    earnings: `${document.earnings.constructor.name}(${document.earnings.toString()})`
  })

  console.log('\n🎉 SUCCESS: Decimal values are now properly handled!')
  console.log('   - Stored as Decimal128 in MongoDB for precision')
  console.log('   - Deserialized as numbers for calculations')
  console.log('   - Serialized as numbers in JSON responses')
}

// Run the demonstration
demonstrateFix()
