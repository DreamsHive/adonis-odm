# GitHub Repository Setup Guide

This guide will help you configure your GitHub repository to work with the comprehensive CI/CD pipeline for the AdonisJS MongoDB ODM project.

## 🔐 Required Secrets

Navigate to your repository → Settings → Secrets and variables → Actions, then add these secrets:

### NPM Publishing

```
NPM_TOKEN
```

- **Description**: Token for publishing to NPM registry
- **How to get**:
  1. Go to [npmjs.com](https://www.npmjs.com) → Account → Access Tokens
  2. Generate a new token with "Automation" type
  3. Copy the token value

### GitHub Token (Optional Enhancement)

```
PERSONAL_ACCESS_TOKEN
```

- **Description**: Enhanced GitHub token for advanced operations
- **How to get**:
  1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Generate new token with scopes: `repo`, `write:packages`, `read:packages`
  3. Copy the token value
- **Note**: Only needed if you want enhanced release features

## 🛡️ Repository Settings

### Branch Protection Rules

1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable these protections:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Required status checks:
     - `Lint & Format Check`
     - `Test (Node 18)`
     - `Test (Node 20)`
     - `Test (Node 21)`
     - `Build Package`
     - `Security Audit`
   - ✅ Restrict pushes that create files larger than 100MB
   - ✅ Require linear history

### Documentation Settings

1. Go to repository settings
2. Ensure TypeDoc configuration is present (`typedoc.json`)
3. API documentation will be generated as artifacts
4. Download artifacts from workflow runs to access documentation

### Security Settings

1. Go to Settings → Security → Code security and analysis
2. Enable:
   - ✅ Dependency graph
   - ✅ Dependabot alerts
   - ✅ Dependabot security updates
   - ✅ CodeQL analysis
   - ✅ Secret scanning

## 📋 Environment Setup

### Development Environment Variables

Create a `.env.example` file in your project root:

```bash
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/adonis_odm_dev
MONGO_TEST_URI=mongodb://localhost:27017/adonis_odm_test

# Application Configuration
NODE_ENV=development
LOG_LEVEL=debug

# Optional: MongoDB Authentication
MONGO_USERNAME=
MONGO_PASSWORD=
MONGO_AUTH_SOURCE=admin
```

### GitHub Actions Environment Variables

The workflows use these environment variables (automatically available):

- `GITHUB_TOKEN` - Automatically provided by GitHub
- `GITHUB_REPOSITORY` - Repository name
- `GITHUB_REF` - Branch/tag reference
- `GITHUB_SHA` - Commit SHA

## 🚀 First Release Setup

### 1. Prepare Your Repository

```bash
# Ensure your main branch is clean
git checkout main
git pull origin main

# Verify all tests pass locally
npm test
npm run test:all
npm run lint
npm run typecheck
```

### 2. Create Initial Release

The release workflow will automatically trigger when you push to main with changes. For your first release:

```bash
# Make a small change to trigger release
echo "# Initial release setup" >> docs/RELEASE_NOTES.md
git add docs/RELEASE_NOTES.md
git commit -m "feat: initial release setup"
git push origin main
```

### 3. Monitor the Release

1. Go to Actions tab in your repository
2. Watch the "Release" workflow execute
3. Check that all jobs pass:
   - ✅ Check for Release-worthy Changes
   - ✅ Run Full Test Suite
   - ✅ Build and Validate Package
   - ✅ Create GitHub Release
   - ✅ Publish to NPM

## 📊 Monitoring and Maintenance

### Weekly Tasks

1. **Review Dependabot PRs**: Check and merge dependency updates
2. **Security Alerts**: Review and address any security vulnerabilities
3. **Performance**: Monitor package size and build times

### Monthly Tasks

1. **Audit Dependencies**: Run `npm audit` and address issues
2. **Update Node.js Versions**: Update CI matrix if new LTS versions available
3. **Review Workflows**: Check if any GitHub Actions need updates

## 🔧 Troubleshooting

### Common Issues

#### NPM Publish Fails

```
Error: 403 Forbidden - PUT https://registry.npmjs.org/adonis-odm
```

**Solution**: Check NPM_TOKEN secret is valid and has publish permissions

#### Tests Fail in CI but Pass Locally

```
MongoDB connection failed
```

**Solution**: Ensure MongoDB service is properly configured in workflow

#### Build Artifacts Missing

```
Error: Artifact 'build-artifacts' not found
```

**Solution**: Check that the build job completed successfully before dependent jobs

#### Documentation Generation Fails

```
Error: TypeDoc generation failed
```

**Solution**:

1. Check TypeDoc configuration in `typedoc.json`
2. Verify source files exist in `src/` directory
3. Check for TypeScript compilation errors

### Debug Mode

To enable debug logging in workflows, add this secret:

```
ACTIONS_STEP_DEBUG=true
```

### Manual Workflow Triggers

You can manually trigger workflows from the Actions tab:

1. **Security Scan**: For immediate security audit
2. **Documentation**: To rebuild docs without code changes
3. **CodeQL**: For additional security analysis

## 📈 Workflow Optimization

### Reducing CI Time

1. **Cache Dependencies**: Already configured with `cache: 'npm'`
2. **Parallel Jobs**: Test matrix runs in parallel
3. **Conditional Execution**: Release only runs when needed

### Reducing Costs

1. **Concurrency Groups**: Prevent multiple runs of same workflow
2. **Path Filters**: Skip workflows for documentation-only changes
3. **Artifact Retention**: Set to 7 days to save storage

## 🎯 Best Practices

### Commit Messages

Use conventional commits for automatic version bumping:

```bash
# Patch release (0.1.0 → 0.1.1)
git commit -m "fix: resolve connection timeout issue"

# Minor release (0.1.0 → 0.2.0)
git commit -m "feat: add support for embedded documents"

# Major release (0.1.0 → 1.0.0)
git commit -m "feat!: redesign query builder API

BREAKING CHANGE: Query builder methods now return promises"
```

### Release Strategy

1. **Development**: Work on `dev` branch
2. **Testing**: Create PR to `main` (triggers CI)
3. **Release**: Merge to `main` (triggers release if changes detected)
4. **Hotfixes**: Create from `main`, merge back to `main` and `dev`

### Security

1. **Never commit secrets** to repository
2. **Use Dependabot** for dependency updates
3. **Monitor security alerts** regularly
4. **Review third-party actions** before using

## 📞 Support

If you encounter issues with the CI/CD pipeline:

1. Check the [GitHub Actions documentation](https://docs.github.com/en/actions)
2. Review workflow logs in the Actions tab
3. Create an issue in the repository with:
   - Workflow name and run ID
   - Error messages
   - Steps to reproduce

---

**Next Steps**: After completing this setup, your repository will have a fully automated CI/CD pipeline that handles testing, security scanning, documentation generation, and releases. Every push to main will be automatically tested and potentially released based on the changes made.
