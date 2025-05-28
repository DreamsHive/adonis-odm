# .gitignore Configuration

This document explains the comprehensive `.gitignore` configuration for the AdonisJS MongoDB ODM project.

## Overview

The `.gitignore` file is carefully crafted to exclude unnecessary files while ensuring all important project files are tracked. It covers:

- Node.js and package manager files
- AdonisJS specific files and directories
- MongoDB specific files
- Development tools and caches
- Operating system specific files
- Security sensitive files

## Categories

### Node.js Dependencies

```
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*
```

### AdonisJS Specific

```
build/                  # Compiled TypeScript output
tmp/                    # Temporary files
.adonisjs/             # AdonisJS cache directory
ace-manifest.json      # Ace commands manifest
public/assets/         # Compiled frontend assets
public/hot             # Hot reload files
```

### Environment Variables & Secrets

```
.env                   # Main environment file
.env.local            # Local overrides
.env.development.local # Development overrides
.env.test.local       # Test environment
.env.production.local # Production overrides
.env.staging          # Staging environment
.env.example.local    # Local example overrides
```

### MongoDB Specific

```
data/                 # Local MongoDB data directory
mongodb-data/         # Alternative data directory
mongo-data/          # Another common data directory
*.log                # MongoDB log files
mongodb.log          # Specific MongoDB log
mongod.log          # MongoDB daemon log
dump/               # MongoDB dump files
*.bson              # BSON dump files
*.json.gz           # Compressed JSON dumps
```

### TypeScript

```
*.tsbuildinfo       # TypeScript incremental build info
.tscache/          # TypeScript cache
```

### Testing

```
coverage/          # Test coverage reports
*.lcov            # Coverage format files
.nyc_output/      # NYC coverage tool output
test-results/     # Test result files
junit.xml         # JUnit test results
test-report.xml   # Test reports
.jest/            # Jest cache
```

### Package Managers

```
package-lock.json  # npm lock file
yarn.lock         # Yarn lock file
pnpm-lock.yaml    # pnpm lock file
bun.lock          # Bun lock file
bun.lockb         # Bun binary lock file
```

### Development Tools

```
.eslintcache      # ESLint cache
.prettiercache    # Prettier cache
.stylelintcache   # Stylelint cache
.cache/           # General cache directory
.parcel-cache/    # Parcel bundler cache
```

### MongoDB ODM Specific

```
test-db/              # Test database files
test-data/            # Test data files
fixtures/             # Test fixtures
generated-models/     # Generated model files
benchmarks/results/   # Performance benchmark results
*.benchmark          # Benchmark files
migrations-backup/    # Migration backups
examples/*/data/      # Example app data
examples/*/.env       # Example app environment files
examples/*/node_modules/ # Example app dependencies
examples/*/build/     # Example app builds
docs/dist/           # Documentation builds
docs/.vitepress/dist/ # VitePress builds
docs/.vitepress/cache/ # VitePress cache
dist/                # Distribution files
lib/                 # Library files
dev.db               # Development database
development.db       # Development database
*.sqlite             # SQLite files
*.sqlite3            # SQLite3 files
*.mongodb            # MongoDB Compass connections
```

## VS Code Integration

The `.gitignore` is configured to work well with VS Code while keeping useful configuration files:

### Ignored VS Code Files

```
.vscode/             # VS Code directory (mostly ignored)
*.code-workspace     # Workspace files
```

### Kept VS Code Files

```
!.vscode/settings.json    # Project settings
!.vscode/tasks.json       # Build tasks
!.vscode/launch.json      # Debug configurations
!.vscode/extensions.json  # Recommended extensions
```

This allows teams to share useful VS Code configurations while ignoring personal settings.

## Validation

The project includes a validation script to ensure the `.gitignore` is working correctly:

```bash
npm run validate:gitignore
```

This script:

- Creates temporary test files matching ignore patterns
- Verifies they are properly ignored
- Checks that important files are NOT ignored
- Shows current git status

## Best Practices

### 1. Test Your Patterns

Always test new `.gitignore` patterns:

```bash
git check-ignore <file-or-pattern>
```

### 2. Already Tracked Files

Remember that `.gitignore` only affects untracked files. To untrack already committed files:

```bash
git rm --cached <file>
git commit -m "Remove tracked file"
```

### 3. Global vs Project Gitignore

This is a project-specific `.gitignore`. Consider also setting up a global `.gitignore` for personal files:

```bash
git config --global core.excludesfile ~/.gitignore_global
```

### 4. Environment Files

Never commit real environment files with secrets. Use `.env.example` as a template:

```bash
# Copy example and fill with real values
cp .env.example .env
```

### 5. Lock Files

Package manager lock files are ignored to avoid conflicts in a library project. For applications, you might want to commit them.

## Common Issues

### Files Still Showing in Git Status

If files that should be ignored are still showing:

1. Check if they're already tracked:

   ```bash
   git ls-files | grep <filename>
   ```

2. If tracked, untrack them:

   ```bash
   git rm --cached <filename>
   ```

3. Verify the pattern works:
   ```bash
   git check-ignore <filename>
   ```

### Pattern Not Working

If a pattern isn't working:

1. Test with a real file:

   ```bash
   touch test-file.log
   git check-ignore test-file.log
   ```

2. Check pattern syntax (use forward slashes, even on Windows)

3. Remember that patterns are relative to the `.gitignore` location

## Maintenance

The `.gitignore` should be updated when:

- Adding new development tools
- Changing build processes
- Adding new file types to the project
- Team members report issues with ignored/tracked files

Run the validation script after making changes:

```bash
npm run validate:gitignore
```

## Resources

- [Git Documentation - gitignore](https://git-scm.com/docs/gitignore)
- [GitHub's gitignore templates](https://github.com/github/gitignore)
- [gitignore.io - Generate gitignore files](https://www.toptal.com/developers/gitignore)
