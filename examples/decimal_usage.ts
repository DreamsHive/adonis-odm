import { BaseModel, column } from '../src/index.js'

/**
 * Example showing how to use the @column.decimal() decorator
 * to properly handle decimal values in MongoDB
 */

export default class Product extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  // ❌ BEFORE: Using regular @column() for decimal values
  // This would cause the bug where decimals are serialized as { "$numberDecimal": "100.99" }
  // @column()
  // declare earnings: number

  // ✅ AFTER: Using @column.decimal() for decimal values
  // This properly handles MongoDB Decimal128 serialization/deserialization
  @column.decimal()
  declare price: number

  @column.decimal()
  declare cost: number

  @column.decimal()
  declare earnings: number

  @column()
  declare category: string

  // Computed property to calculate profit margin
  get profitMargin(): number {
    if (this.price === 0) return 0
    return ((this.price - this.cost) / this.price) * 100
  }
}

// Example usage:
async function demonstrateDecimalHandling() {
  // Create a product with decimal values
  const product = new Product()
  product.name = 'Premium Widget'
  product.price = 100.99
  product.cost = 75.50
  product.earnings = 25.49
  product.category = 'Electronics'

  console.log('=== Original Values ===')
  console.log('Price:', product.price, typeof product.price)
  console.log('Cost:', product.cost, typeof product.cost)
  console.log('Earnings:', product.earnings, typeof product.earnings)
  console.log('Profit Margin:', product.profitMargin.toFixed(2) + '%')

  // When saved to MongoDB, these will be stored as Decimal128
  const document = product.toDocument()
  console.log('\n=== MongoDB Document (for storage) ===')
  console.log('Document price type:', document.price.constructor.name)
  console.log('Document price value:', document.price.toString())

  // When serialized to JSON (for API responses), these will be regular numbers
  const json = product.toJSON()
  console.log('\n=== JSON Output (for API responses) ===')
  console.log('JSON:', JSON.stringify(json, null, 2))

  // Simulate loading from MongoDB with Decimal128 values
  console.log('\n=== Loading from MongoDB ===')
  const mongoData = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Premium Widget',
    price: { $numberDecimal: '100.99' },
    cost: { $numberDecimal: '75.50' },
    earnings: { $numberDecimal: '25.49' },
    category: 'Electronics'
  }

  const loadedProduct = new Product()
  loadedProduct.hydrateFromDocument(mongoData as any)

  console.log('Loaded price:', loadedProduct.price, typeof loadedProduct.price)
  console.log('Loaded cost:', loadedProduct.cost, typeof loadedProduct.cost)
  console.log('Loaded earnings:', loadedProduct.earnings, typeof loadedProduct.earnings)
  console.log('Calculated profit margin:', loadedProduct.profitMargin.toFixed(2) + '%')

  // JSON serialization works correctly
  const loadedJson = loadedProduct.toJSON()
  console.log('\n=== Loaded Product JSON ===')
  console.log('JSON:', JSON.stringify(loadedJson, null, 2))
}

// Comparison: What happens with regular @column() decorator
class ProductWithRegularColumn extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  // This will cause the serialization bug
  @column()
  declare price: number
}

async function demonstrateProblem() {
  console.log('\n=== DEMONSTRATING THE PROBLEM ===')
  
  const product = new ProductWithRegularColumn()
  product.name = 'Test Product'
  product.price = 100.99

  // Simulate data coming from MongoDB with decimal format
  const mongoData = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Product',
    price: { $numberDecimal: '100.99' }
  }

  product.hydrateFromDocument(mongoData as any)
  
  // Without the decimal decorator, this would show the raw MongoDB decimal object
  const json = product.toJSON()
  console.log('Without @column.decimal():', JSON.stringify(json, null, 2))
  
  // The price would be serialized as { "$numberDecimal": "100.99" } instead of 100.99
}

// Run the demonstrations
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateDecimalHandling()
    .then(() => demonstrateProblem())
    .catch(console.error)
}
