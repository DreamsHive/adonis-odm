#!/usr/bin/env node

/**
 * Environment-Specific Seeder Demonstration
 *
 * This script demonstrates the environment-specific functionality of the Adonis ODM
 * seeder system by simulating different environments and showing which seeders
 * would run in each scenario.
 */

import { BaseSeeder } from '../src/seeders/base_seeder.js'

// Demo seeder classes
class DevelopmentDataSeeder extends BaseSeeder {
  static environment = ['development', 'testing']
  async run(): Promise<void> {
    console.log('  📝 Inserting sample users and test data...')
  }
}

class ProductionEssentialsSeeder extends BaseSeeder {
  static environment = ['production']
  async run(): Promise<void> {
    console.log('  🔧 Setting up production configurations...')
  }
}

class StagingAndProdSeeder extends BaseSeeder {
  static environment = ['staging', 'production']
  async run(): Promise<void> {
    console.log('  ⚙️  Configuring external services...')
  }
}

class TestFixturesSeeder extends BaseSeeder {
  static environment = ['testing']
  async run(): Promise<void> {
    console.log('  🧪 Creating predictable test fixtures...')
  }
}

class UniversalSeeder extends BaseSeeder {
  // No environment restriction
  async run(): Promise<void> {
    console.log('  🌍 Setting up universal roles and permissions...')
  }
}

class CustomEnvironmentSeeder extends BaseSeeder {
  static environment = ['demo', 'showcase']
  async run(): Promise<void> {
    console.log('  🎭 Setting up demo/showcase data...')
  }
}

// Demo seeders array
const demoSeeders = [
  { name: 'DevelopmentDataSeeder', class: DevelopmentDataSeeder },
  { name: 'ProductionEssentialsSeeder', class: ProductionEssentialsSeeder },
  { name: 'StagingAndProdSeeder', class: StagingAndProdSeeder },
  { name: 'TestFixturesSeeder', class: TestFixturesSeeder },
  { name: 'UniversalSeeder', class: UniversalSeeder },
  { name: 'CustomEnvironmentSeeder', class: CustomEnvironmentSeeder },
]

// Test environments
const testEnvironments = ['development', 'testing', 'staging', 'production', 'demo', 'unknown']

function printHeader(title: string) {
  console.log('\n' + '='.repeat(60))
  console.log(`🌱 ${title}`)
  console.log('='.repeat(60))
}

function printEnvironmentTest(environment: string) {
  console.log(`\n🔍 Testing Environment: "${environment}"`)
  console.log('-'.repeat(40))

  let executed = 0
  let skipped = 0

  for (const seeder of demoSeeders) {
    const shouldRun = seeder.class.shouldRun(environment)
    const envList = seeder.class.environment?.join(', ') || 'all environments'

    if (shouldRun) {
      console.log(`✅ ${seeder.name}`)
      console.log(`   Environments: [${envList}]`)
      executed++
    } else {
      console.log(`⏭️  ${seeder.name} (skipped)`)
      console.log(`   Environments: [${envList}]`)
      console.log(`   Reason: Environment restriction`)
      skipped++
    }
  }

  console.log(`\n📊 Summary: ${executed} executed, ${skipped} skipped`)
}

function demonstrateEnvironmentLogic() {
  printHeader('Environment-Specific Seeder Logic Demonstration')

  console.log(`
This demonstration shows how the Adonis ODM seeder system handles
environment-specific execution. Each seeder can specify which
environments it should run in using the static 'environment' property.

Seeder Configurations:
• DevelopmentDataSeeder: ['development', 'testing']
• ProductionEssentialsSeeder: ['production']  
• StagingAndProdSeeder: ['staging', 'production']
• TestFixturesSeeder: ['testing']
• UniversalSeeder: (no restriction - runs everywhere)
• CustomEnvironmentSeeder: ['demo', 'showcase']
`)

  // Test each environment
  for (const env of testEnvironments) {
    printEnvironmentTest(env)
  }
}

function demonstrateAdvancedScenarios() {
  printHeader('Advanced Environment Scenarios')

  console.log('\n🔬 Edge Cases and Special Scenarios:')

  // Test case sensitivity
  console.log('\n1. Case Sensitivity:')
  console.log(`   Production (lowercase): ${ProductionEssentialsSeeder.shouldRun('production')} ✅`)
  console.log(`   Production (uppercase): ${ProductionEssentialsSeeder.shouldRun('PRODUCTION')} ❌`)
  console.log(
    `   Production (mixed case): ${ProductionEssentialsSeeder.shouldRun('Production')} ❌`
  )

  // Test empty environment
  class EmptyEnvironmentSeeder extends BaseSeeder {
    static environment: string[] = []
    async run(): Promise<void> {}
  }

  console.log('\n2. Empty Environment Array:')
  console.log(
    `   Empty array in 'development': ${EmptyEnvironmentSeeder.shouldRun('development')} ✅`
  )
  console.log(
    `   Empty array in 'production': ${EmptyEnvironmentSeeder.shouldRun('production')} ✅`
  )
  console.log(`   (Empty array means run in ALL environments)`)

  // Test undefined environment
  class UndefinedEnvironmentSeeder extends BaseSeeder {
    // No environment property defined
    async run(): Promise<void> {}
  }

  console.log('\n3. No Environment Property:')
  console.log(
    `   Undefined in 'development': ${UndefinedEnvironmentSeeder.shouldRun('development')} ✅`
  )
  console.log(
    `   Undefined in 'production': ${UndefinedEnvironmentSeeder.shouldRun('production')} ✅`
  )
  console.log(`   (No property means run in ALL environments)`)

  // Test multiple environments
  console.log('\n4. Multiple Environment Support:')
  console.log(`   StagingAndProd in 'staging': ${StagingAndProdSeeder.shouldRun('staging')} ✅`)
  console.log(
    `   StagingAndProd in 'production': ${StagingAndProdSeeder.shouldRun('production')} ✅`
  )
  console.log(
    `   StagingAndProd in 'development': ${StagingAndProdSeeder.shouldRun('development')} ❌`
  )
}

function demonstrateRealWorldUsage() {
  printHeader('Real-World Usage Examples')

  console.log(`
🏗️  Common Environment Patterns:

1. DEVELOPMENT + TESTING:
   • Sample users and test data
   • Debug configurations
   • Development-specific settings
   
2. PRODUCTION ONLY:
   • Essential system configurations
   • Production admin users
   • Critical application settings
   
3. STAGING + PRODUCTION:
   • External service configurations
   • Real API keys and endpoints
   • Performance monitoring setup
   
4. TESTING ONLY:
   • Predictable test fixtures
   • Known IDs for test assertions
   • Isolated test data
   
5. UNIVERSAL (No Restrictions):
   • User roles and permissions
   • System-wide settings
   • Essential data structures

💡 Best Practices:

• Use clear, descriptive seeder names
• Document environment purposes
• Validate required environment variables
• Make seeders idempotent (safe to run multiple times)
• Group related data in single seeders
• Use consistent environment naming
`)
}

function demonstrateCommandUsage() {
  printHeader('Command Line Usage Examples')

  console.log(`
🚀 Running Seeders with Environment Control:

# Run all seeders for current environment
NODE_ENV=development node ace odm:seed

# Run all seeders for production
NODE_ENV=production node ace odm:seed

# Run specific seeder (still respects environment restrictions)
NODE_ENV=testing node ace odm:seed --files="./database/seeders/test_fixtures.ts"

# Interactive mode with environment filtering
NODE_ENV=staging node ace odm:seed --interactive

# Using specific connection with environment
NODE_ENV=production node ace odm:seed --connection=primary

📋 Expected Output:

Starting ODM seeder execution...
Environment: production

✅ ProductionEssentialsSeeder (150ms)
✅ StagingAndProdSeeder (75ms)  
✅ UniversalSeeder (50ms)
⚠️  DevelopmentDataSeeder: Environment restriction: seeder only runs in [development, testing], current: production
⚠️  TestFixturesSeeder: Environment restriction: seeder only runs in [testing], current: production

Summary: 3 executed, 2 skipped, 0 failed
`)
}

// Main execution
async function main() {
  console.log('🌱 Adonis ODM Environment-Specific Seeders Demo')
  console.log('================================================')

  demonstrateEnvironmentLogic()
  demonstrateAdvancedScenarios()
  demonstrateRealWorldUsage()
  demonstrateCommandUsage()

  console.log('\n' + '='.repeat(60))
  console.log('✨ Demo completed! Environment-specific seeders provide:')
  console.log('   • Safe data separation between environments')
  console.log('   • Flexible deployment strategies')
  console.log('   • Clear execution feedback')
  console.log('   • Robust error handling')
  console.log('='.repeat(60))
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export {
  DevelopmentDataSeeder,
  ProductionEssentialsSeeder,
  StagingAndProdSeeder,
  TestFixturesSeeder,
  UniversalSeeder,
  CustomEnvironmentSeeder,
}
