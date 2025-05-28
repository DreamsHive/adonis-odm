#!/usr/bin/env node

/**
 * Validate .gitignore patterns
 *
 * This script tests that important files are properly ignored or tracked
 * by the .gitignore configuration.
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'

console.log('🔍 Validating .gitignore patterns...\n')

// Create a temporary test directory
const testDir = '.gitignore-test'
if (existsSync(testDir)) {
  rmSync(testDir, { recursive: true, force: true })
}
mkdirSync(testDir, { recursive: true })

// Files/patterns that SHOULD be ignored
const shouldBeIgnored = [
  { pattern: 'node_modules/', testFile: 'node_modules/test.js' },
  { pattern: 'build/', testFile: 'build/test.js' },
  { pattern: 'tmp/', testFile: 'tmp/test.js' },
  { pattern: '.env', testFile: '.env' },
  { pattern: '.env.local', testFile: '.env.local' },
  { pattern: 'coverage/', testFile: 'coverage/test.js' },
  { pattern: '*.tgz', testFile: 'test.tgz' },
  { pattern: 'package-lock.json', testFile: 'package-lock.json' },
  { pattern: 'yarn.lock', testFile: 'yarn.lock' },
  { pattern: 'pnpm-lock.yaml', testFile: 'pnpm-lock.yaml' },
  { pattern: 'bun.lock', testFile: 'bun.lock' },
  { pattern: '.DS_Store', testFile: '.DS_Store' },
  { pattern: 'Thumbs.db', testFile: 'Thumbs.db' },
  { pattern: '*.log', testFile: 'test.log' },
  { pattern: '*.tsbuildinfo', testFile: 'test.tsbuildinfo' },
  { pattern: '.adonisjs/', testFile: '.adonisjs/test.js' },
  { pattern: 'ace-manifest.json', testFile: 'ace-manifest.json' },
  { pattern: 'mongodb-data/', testFile: 'mongodb-data/test.js' },
  { pattern: 'test-db/', testFile: 'test-db/test.js' },
  { pattern: '*.benchmark', testFile: 'test.benchmark' },
  { pattern: 'docs/dist/', testFile: 'docs/dist/test.js' },
  { pattern: 'dist/', testFile: 'dist/test.js' },
  { pattern: 'lib/', testFile: 'lib/test.js' },
  { pattern: '*.sqlite', testFile: 'test.sqlite' },
  { pattern: '*.mongodb', testFile: 'test.mongodb' },
]

// Files that should NOT be ignored (these should exist)
const shouldNotBeIgnored = [
  'package.json',
  'tsconfig.json',
  'README.md',
  'LICENSE.md',
  'configure.ts',
  'src/',
  'providers/',
  'commands/',
  'stubs/',
  'tests/',
  'docs/',
  '.gitignore',
  '.editorconfig',
]

let errors = 0

console.log('✅ Testing files that SHOULD be ignored:')

// Create test files and check if they're ignored
for (const { pattern, testFile } of shouldBeIgnored) {
  try {
    const fullPath = join(testDir, testFile)
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))

    // Create directory if needed
    if (dir && dir !== testDir) {
      mkdirSync(dir, { recursive: true })
    }

    // Create test file
    writeFileSync(fullPath, 'test')

    // Check if it's ignored
    try {
      execSync(`git check-ignore "${fullPath}" 2>/dev/null`, { stdio: 'pipe' })
      console.log(`   ✓ ${pattern}`)
    } catch (error) {
      console.log(`   ❌ ${pattern} - NOT being ignored`)
      errors++
    }
  } catch (error) {
    console.log(`   ⚠️  ${pattern} - Could not test: ${error.message}`)
  }
}

console.log('\n✅ Testing files that should NOT be ignored:')
for (const file of shouldNotBeIgnored) {
  try {
    execSync(`git check-ignore "${file}" 2>/dev/null`, { stdio: 'pipe' })
    console.log(`   ❌ ${file} - INCORRECTLY being ignored`)
    errors++
  } catch (error) {
    console.log(`   ✓ ${file}`)
  }
}

// Clean up test directory
if (existsSync(testDir)) {
  rmSync(testDir, { recursive: true, force: true })
}

console.log('\n📊 Validation Summary:')
if (errors === 0) {
  console.log('🎉 All .gitignore patterns are working correctly!')
} else {
  console.log(`⚠️  Found ${errors} issue(s) with .gitignore patterns`)
}

console.log('\n💡 Tips:')
console.log('- Run "git status" to see what files are currently tracked')
console.log('- Use "git check-ignore <file>" to test specific patterns')
console.log('- Remember that already tracked files need to be untracked manually')
console.log('- The .gitignore file only affects untracked files')

// Show current git status
console.log('\n📋 Current git status:')
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' })
  if (status.trim()) {
    console.log(status)
  } else {
    console.log('Working directory is clean')
  }
} catch (error) {
  console.log('Could not get git status')
}
