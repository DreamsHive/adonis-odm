# 🚀 GitHub Actions CI/CD for AdonisJS MongoDB ODM

This repository includes a comprehensive, production-ready GitHub Actions setup for building, testing, securing, and releasing the AdonisJS MongoDB ODM package.

## 📋 Quick Start

1. **Set up NPM Token**:

   ```bash
   # Go to GitHub repository → Settings → Secrets and variables → Actions
   # Add secret: NPM_TOKEN (your npm authentication token)
   ```

2. **Enable GitHub Pages**:

   ```bash
   # Go to Settings → Pages → Source: GitHub Actions
   ```

3. **Configure Branch Protection**:

   ```bash
   # Go to Settings → Branches → Add rule for 'main'
   # Require status checks: CI jobs
   ```

4. **Start Developing**:
   ```bash
   git checkout -b feature/my-feature
   # Make changes
   git commit -m "feat: add new feature"
   git push origin feature/my-feature
   # Create PR → Automatic CI runs
   ```

## 🔄 Workflows Overview

| Workflow          | Trigger        | Purpose                       | Duration   |
| ----------------- | -------------- | ----------------------------- | ---------- |
| **CI**            | Push/PR        | Testing, building, validation | ~10-15 min |
| **Release**       | Push to main   | Automated releases to NPM     | ~15-20 min |
| **Security**      | Daily/Push/PR  | Security scanning             | ~5-10 min  |
| **Documentation** | Docs changes   | Generate and deploy docs      | ~5-8 min   |
| **CodeQL**        | Weekly/Push/PR | Advanced security analysis    | ~15-25 min |

## 🎯 Key Features

### ✅ Comprehensive Testing

- **Multi-Node.js versions** (18, 20, 21)
- **Real MongoDB integration** tests
- **Package installation** validation
- **AdonisJS compatibility** testing

### 🔒 Security-First Approach

- **Daily vulnerability scans**
- **Secret detection** with TruffleHog
- **License compliance** checking
- **Supply chain security** monitoring
- **CodeQL analysis** for code vulnerabilities

### 📦 Automated Releases

- **Semantic versioning** based on commit messages
- **Automatic changelog** generation
- **NPM publishing** with proper tagging
- **GitHub releases** with assets

### 📚 Documentation Automation

- **API documentation** generation with TypeDoc
- **Link validation** and completeness checking
- **Documentation artifacts** for download
- **Documentation freshness** monitoring

## 🏷️ Commit Message Convention

Use conventional commits for automatic release detection:

```bash
# Patch release (0.1.0 → 0.1.1)
fix: resolve connection timeout issue
fix(query): handle null values in where clauses

# Minor release (0.1.0 → 0.2.0)
feat: add embedded document support
feat(relationships): implement hasMany relationships

# Major release (0.1.0 → 1.0.0)
feat: redesign query builder API

BREAKING CHANGE: Query builder methods now return promises
```

## 🔧 Workflow Details

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Runs on**: Every push and PR to main/develop

**Jobs**:

- **Lint & Format**: ESLint, Prettier, TypeScript checks
- **Test Matrix**: Node.js 18, 20, 21 with MongoDB
- **Build**: Package compilation and validation
- **Security**: npm audit and vulnerability scanning
- **Package Health**: Size and bundle analysis
- **Compatibility**: Test with different AdonisJS versions

**Example Output**:

```
✅ Lint & Format Check
✅ Test (Node 18) - 45 tests passed
✅ Test (Node 20) - 45 tests passed
✅ Test (Node 21) - 45 tests passed
✅ Build Package - 2.3MB, all exports valid
✅ Security Audit - No vulnerabilities
✅ AdonisJS Compatibility - v6.12.0, v6.18.0
```

### 2. Release Workflow (`.github/workflows/release.yml`)

**Runs on**: Push to main branch

**Smart Release Detection**:

- Analyzes commit messages since last release
- Determines version bump type (major/minor/patch)
- Skips release if no significant changes

**Process**:

1. **Detect Changes** → Determine if release needed
2. **Run Tests** → Full test suite on all Node versions
3. **Build & Validate** → Bump version, update changelog
4. **Create Release** → GitHub release with notes
5. **Publish NPM** → Automated NPM publishing

**Example Release**:

```
🎉 Released v0.2.0!
📦 NPM: https://www.npmjs.com/package/adonis-odm
🏷️ GitHub: https://github.com/yourusername/adonis-odm/releases/tag/v0.2.0
```

### 3. Security Workflow (`.github/workflows/security.yml`)

**Runs on**: Daily at 2 AM UTC, push/PR, manual trigger

**Security Checks**:

- **Dependency Audit**: npm audit with detailed reporting
- **CodeQL Analysis**: GitHub's semantic code analysis
- **Secret Scanning**: TruffleHog for exposed secrets
- **License Compliance**: Check for incompatible licenses
- **Supply Chain**: Detect malicious packages
- **Container Security**: Docker vulnerability scanning

**Example Report**:

```
🔒 Security Report Summary
| Check | Status |
|-------|--------|
| Dependency Audit | ✅ Passed |
| CodeQL Analysis | ✅ Passed |
| Secret Scanning | ✅ Passed |
| License Check | ✅ Passed |
| Supply Chain | ✅ Passed |
```

### 4. Documentation Workflow (`.github/workflows/docs.yml`)

**Runs on**: Documentation changes, push to main

**Features**:

- **Link Validation**: Check for broken links
- **Code Example Validation**: Verify TypeScript examples
- **API Documentation**: Generate with TypeDoc
- **Documentation Artifacts**: Available for download from workflow runs
- **Freshness Check**: Alert for outdated docs

### 5. CodeQL Advanced Security (`.github/workflows/codeql.yml`)

**Runs on**: Weekly, push/PR, manual trigger

**Advanced Analysis**:

- **Extended Security Queries**: Comprehensive vulnerability detection
- **Custom Security Patterns**: Project-specific checks
- **SARIF Integration**: Results in GitHub Security tab

## 📊 Monitoring & Maintenance

### Status Monitoring

Add status badges to your README:

```markdown
![CI](https://github.com/yourusername/adonis-odm/workflows/CI/badge.svg)
![Security](https://github.com/yourusername/adonis-odm/workflows/Security/badge.svg)
![Release](https://github.com/yourusername/adonis-odm/workflows/Release/badge.svg)
```

### Regular Tasks

- **Weekly**: Review Dependabot PRs
- **Monthly**: Check security alerts
- **Quarterly**: Review and update workflows

### Notifications

Configure GitHub notifications:

- Go to Settings → Notifications
- Enable Actions notifications
- Set up email alerts for failures

## 🔍 Troubleshooting

### Common Issues & Solutions

#### NPM Publishing Fails

```bash
# Check NPM token
echo $NPM_TOKEN | npm whoami

# Verify package.json
npm run validate:package

# Test local publish
npm publish --dry-run
```

#### Tests Fail

```bash
# Check MongoDB connection
mongosh --eval "db.runCommand({ping: 1})"

# Run tests locally
npm run test:all

# Check environment variables
echo $MONGO_URI
```

#### Security Scans Fail

```bash
# Run local audit
npm run security:audit

# Fix vulnerabilities
npm run security:fix

# Check for false positives
npm audit --audit-level=high
```

#### Documentation Generation Fails

```bash
# Check TypeDoc configuration
cat typedoc.json

# Verify no broken links
npm install -g markdown-link-check
markdown-link-check README.md

# Test TypeDoc generation
npm run docs:api
```

### Debug Workflow Issues

1. **Check Workflow Logs**:

   - Go to Actions tab
   - Click on failed workflow
   - Review job logs

2. **Test Locally**:

   ```bash
   # Install act for local testing
   curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

   # Run workflow locally
   act -j test
   ```

3. **Validate Configuration**:

   ```bash
   # Check workflow syntax
   yamllint .github/workflows/*.yml

   # Validate package.json
   npm run validate:package
   ```

## 🚀 Advanced Configuration

### Custom Environments

Create additional environments for staging:

```yaml
# .github/workflows/staging.yml
environment:
  name: staging
  url: https://staging.yourdomain.com
```

### Matrix Testing

Extend testing matrix:

```yaml
strategy:
  matrix:
    node-version: ['18', '20', '21']
    mongodb-version: ['6.0', '7.0']
    os: [ubuntu-latest, windows-latest, macos-latest]
```

### Custom Security Rules

Add project-specific security checks:

```bash
# .github/workflows/custom-security.yml
- name: Check for MongoDB injection
  run: |
    if grep -r "db\.\$where" src/; then
      echo "Potential MongoDB injection found"
      exit 1
    fi
```

## 📈 Performance Optimization

### Workflow Optimization

1. **Cache Dependencies**:

   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'npm'
   ```

2. **Parallel Jobs**:

   ```yaml
   jobs:
     test:
       strategy:
         matrix:
           node-version: ['18', '20', '21']
   ```

3. **Conditional Execution**:
   ```yaml
   if: github.event_name == 'push' && github.ref == 'refs/heads/main'
   ```

### Cost Management

- **Limit concurrent jobs**: Use `concurrency` groups
- **Skip unnecessary runs**: Use `paths` filters
- **Optimize test duration**: Use test parallelization

## 🤝 Contributing to Workflows

### Making Changes

1. **Test in Fork**: Always test workflow changes in a fork first
2. **Small Changes**: Make incremental improvements
3. **Document Changes**: Update this README
4. **Security Review**: Consider security implications

### Best Practices

- **Use official actions** when possible
- **Pin action versions** for security
- **Add error handling** and retries
- **Include comprehensive logging**
- **Test failure scenarios**

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [NPM Publishing](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)

---

**Need Help?**

- 📖 Check the [detailed setup guide](docs/GITHUB_ACTIONS_SETUP.md)
- 🐛 [Open an issue](https://github.com/yourusername/adonis-odm/issues)
- 💬 [Start a discussion](https://github.com/yourusername/adonis-odm/discussions)
