# 🚀 GitHub Actions Quick Start Guide

This guide will help you quickly set up the comprehensive CI/CD pipeline for your AdonisJS MongoDB ODM project.

## ⚡ Quick Setup (5 minutes)

### 1. Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

```
NPM_TOKEN
```

**How to get NPM_TOKEN:**

1. Go to [npmjs.com](https://www.npmjs.com) → Account → Access Tokens
2. Generate new token with "Automation" type
3. Copy the token value

### 2. Repository Settings

1. Go to Settings → Security → Code security and analysis
2. Enable security features:
   - ✅ Dependency graph
   - ✅ Dependabot alerts
   - ✅ Dependabot security updates
   - ✅ CodeQL analysis
   - ✅ Secret scanning

### 3. Branch Protection (Recommended)

1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Required status checks:
     - `Lint & Format Check`
     - `Test (Node 18)`
     - `Test (Node 20)`
     - `Test (Node 21)`
     - `Build Package`

### 4. Test the Setup

Push a commit to main branch:

```bash
git add .
git commit -m "feat: setup GitHub Actions CI/CD pipeline"
git push origin main
```

Watch the workflows run in the Actions tab!

## 🎯 What You Get

### ✅ Continuous Integration (CI)

- **Multi-Node.js testing** (18, 20, 21)
- **MongoDB integration tests**
- **Linting and formatting checks**
- **TypeScript compilation**
- **Package validation**
- **Security auditing**

### 🔒 Security Scanning

- **Daily vulnerability scans**
- **Secret detection**
- **License compliance**
- **Supply chain security**
- **CodeQL analysis**

### 📦 Automated Releases

- **Semantic versioning** based on commit messages
- **Automatic changelog generation**
- **NPM publishing**
- **GitHub releases**

### 📚 Documentation

- **API documentation** with TypeDoc
- **Documentation validation**
- **Link validation**

## 🏷️ Commit Message Format

Use conventional commits for automatic releases:

```bash
# Patch release (0.1.0 → 0.1.1)
git commit -m "fix: resolve connection timeout issue"

# Minor release (0.1.0 → 0.2.0)
git commit -m "feat: add embedded document support"

# Major release (0.1.0 → 1.0.0)
git commit -m "feat!: redesign query builder API

BREAKING CHANGE: Query builder methods now return promises"
```

## 📊 Monitoring

### Status Badges

Your README now includes status badges:

- [![CI](https://github.com/DreamsHive/adonis-odm/workflows/CI/badge.svg)](https://github.com/DreamsHive/adonis-odm/actions/workflows/ci.yml)
- [![Security](https://github.com/DreamsHive/adonis-odm/workflows/Security/badge.svg)](https://github.com/DreamsHive/adonis-odm/actions/workflows/security.yml)
- [![Release](https://github.com/DreamsHive/adonis-odm/workflows/Release/badge.svg)](https://github.com/DreamsHive/adonis-odm/actions/workflows/release.yml)

### Workflow Status

Monitor your workflows:

1. Go to Actions tab in your repository
2. Check workflow runs and logs
3. Review security alerts in Security tab

## 🔧 Troubleshooting

### NPM Publishing Fails

```bash
# Check your NPM token
echo $NPM_TOKEN | npm whoami
```

### Tests Fail

```bash
# Run tests locally first
npm run test:all
npm run lint
npm run typecheck
```

### Security Issues

```bash
# Run security audit locally
npm run security:audit
```

## 📚 Next Steps

1. **Review the workflows** in `.github/workflows/`
2. **Read the detailed guide** in `docs/GITHUB_ACTIONS_SETUP.md`
3. **Configure Dependabot** (already set up in `.github/dependabot.yml`)
4. **Set up notifications** in GitHub Settings

## 🎉 You're All Set!

Your repository now has:

- ✅ Automated testing on every push/PR
- ✅ Security scanning and monitoring
- ✅ Automated releases to NPM
- ✅ Documentation generation and deployment
- ✅ Dependency management with Dependabot

Happy coding! 🚀
