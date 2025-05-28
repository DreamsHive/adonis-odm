# GitHub Actions CI/CD Setup

This document explains the comprehensive GitHub Actions workflows set up for the AdonisJS MongoDB ODM project.

## 🚀 Overview

The project uses a multi-workflow approach for CI/CD, security, and automation:

- **CI Workflow** - Continuous Integration with testing and building
- **Release Workflow** - Automated versioning and NPM publishing
- **Security Workflow** - Comprehensive security scanning
- **Documentation Workflow** - Documentation generation and deployment
- **CodeQL Workflow** - Advanced security analysis

## 📋 Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**

- Push to `main` and `develop` branches
- Pull requests to `main` and `develop` branches

**Jobs:**

- **Lint & Format Check** - ESLint, Prettier, TypeScript type checking
- **Test** - Unit and integration tests across Node.js 18, 20, 21
- **Build** - Package compilation and validation
- **Security Audit** - npm audit and vulnerability scanning
- **Package Health** - Size checks and bundle analysis
- **AdonisJS Compatibility** - Test with different AdonisJS versions

**Features:**

- MongoDB service for integration tests
- Multi-Node.js version testing
- Package installation testing
- Build artifact validation

### 2. Release Workflow (`.github/workflows/release.yml`)

**Triggers:**

- Push to `main` branch (excluding docs and markdown files)

**Jobs:**

- **Change Detection** - Intelligent release detection based on commit messages
- **Full Test Suite** - Complete testing before release
- **Build & Validate** - Version bumping and package validation
- **GitHub Release** - Automated release creation with changelog
- **NPM Publishing** - Automated NPM package publishing

**Features:**

- Semantic versioning based on commit messages
- Automatic changelog generation
- Prerelease detection and tagging
- Release asset uploads

### 3. Security Workflow (`.github/workflows/security.yml`)

**Triggers:**

- Daily at 2 AM UTC (scheduled)
- Push/PR to `main` and `develop`
- Manual trigger

**Jobs:**

- **Dependency Audit** - npm audit with vulnerability reporting
- **CodeQL Analysis** - GitHub's semantic code analysis
- **Secret Scanning** - TruffleHog for secret detection
- **License Compliance** - License compatibility checking
- **Supply Chain Security** - Malicious package detection
- **Docker Security** - Container vulnerability scanning (scheduled only)

### 4. Documentation Workflow (`.github/workflows/docs.yml`)

**Triggers:**

- Push to `main` with documentation changes
- Pull requests affecting documentation

**Jobs:**

- **Documentation Validation** - Link checking and completeness
- **API Documentation** - TypeDoc generation
- **GitHub Pages Deployment** - Automated documentation site
- **Freshness Check** - Documentation age monitoring

### 5. CodeQL Advanced Security (`.github/workflows/codeql.yml`)

**Triggers:**

- Push/PR to main branches
- Weekly on Sundays at 3 AM UTC
- Manual trigger

**Jobs:**

- **Advanced CodeQL Analysis** - Extended security queries
- **Custom Security Checks** - Project-specific security patterns
- **SARIF Upload** - Security results integration

## 🔧 Setup Instructions

### 1. Repository Secrets

Add these secrets to your GitHub repository:

```
NPM_TOKEN - Your NPM authentication token for publishing
```

### 2. Environment Setup

Create the `npm-publish` environment in your repository settings:

- Go to Settings → Environments
- Create new environment named `npm-publish`
- Add protection rules if desired

### 3. Security Settings

Enable security features in repository settings:

- Go to Settings → Security → Code security and analysis
- Enable: Dependency graph, Dependabot alerts, CodeQL analysis, Secret scanning

### 4. Branch Protection

Set up branch protection rules for `main`:

- Require status checks to pass
- Require branches to be up to date
- Include these required checks:
  - `Lint & Format Check`
  - `Test (Node 18)`
  - `Test (Node 20)`
  - `Test (Node 21)`
  - `Build Package`

### 5. Dependabot Configuration

The `.github/dependabot.yml` file is configured for:

- Weekly npm dependency updates
- GitHub Actions updates
- Grouped updates for related packages
- Automatic labeling and assignment

## 📊 Workflow Features

### Intelligent Release Detection

The release workflow automatically detects when to create releases based on:

- **Major**: Breaking changes (commit messages with "BREAKING CHANGE")
- **Minor**: New features (commit messages starting with "feat:")
- **Patch**: Bug fixes (commit messages starting with "fix:")

### Comprehensive Testing

- **Multi-Node.js versions**: Tests on Node.js 18, 20, and 21
- **MongoDB integration**: Real MongoDB service for integration tests
- **Package validation**: Tests actual package installation and imports
- **AdonisJS compatibility**: Tests with different AdonisJS versions

### Security-First Approach

- **Multiple security tools**: CodeQL, npm audit, TruffleHog, license checking
- **Scheduled scans**: Daily security checks
- **Supply chain security**: Malicious package detection
- **Container security**: Docker image vulnerability scanning

### Documentation Automation

- **Link validation**: Automatic broken link detection
- **API documentation**: TypeDoc generation
- **Documentation artifacts**: Generated documentation available for download
- **Freshness monitoring**: Alerts for outdated documentation

## 🏷️ Commit Message Conventions

For automatic release detection, use these commit message prefixes:

```bash
feat: add new feature (triggers minor release)
fix: bug fix (triggers patch release)
docs: documentation changes (no release)
chore: maintenance tasks (no release)
ci: CI/CD changes (no release)
test: test changes (no release)

# For breaking changes, include in commit body:
BREAKING CHANGE: description of breaking change (triggers major release)
```

## 📈 Monitoring and Maintenance

### Workflow Status

Monitor workflow status through:

- GitHub Actions tab
- Status badges (add to README)
- Email notifications (configure in GitHub settings)

### Security Monitoring

- Check Security tab regularly
- Review Dependabot PRs
- Monitor security workflow summaries

### Release Monitoring

- Verify NPM package publication
- Check GitHub releases
- Monitor download statistics

## 🔍 Troubleshooting

### Common Issues

1. **NPM Publishing Fails**

   - Check NPM_TOKEN secret
   - Verify npm-publish environment exists
   - Ensure package.json version is correct

2. **Tests Fail**

   - Check MongoDB service status
   - Verify test environment variables
   - Review test logs for specific failures

3. **Security Scans Fail**

   - Review vulnerability reports
   - Update dependencies if needed
   - Check for false positives

4. **Documentation Generation Fails**
   - Check TypeDoc configuration
   - Verify source files exist
   - Review build logs

### Debug Steps

1. **Check workflow logs** in GitHub Actions tab
2. **Review job summaries** for detailed reports
3. **Verify secrets and environment variables**
4. **Test locally** before pushing changes

## 🚀 Best Practices

### Development Workflow

1. **Create feature branches** from `develop`
2. **Use conventional commits** for automatic versioning
3. **Write tests** for new features
4. **Update documentation** as needed
5. **Review security alerts** regularly

### Release Process

1. **Merge to main** triggers automatic release
2. **Review generated changelog** before release
3. **Monitor NPM publication** status
4. **Verify package installation** works correctly

### Security Practices

1. **Review Dependabot PRs** promptly
2. **Address security alerts** quickly
3. **Keep dependencies updated**
4. **Follow secure coding practices**

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [CodeQL Documentation](https://codeql.github.com/docs/)

## 🤝 Contributing

When contributing to the workflows:

1. **Test changes** in a fork first
2. **Document modifications** in this file
3. **Follow security best practices**
4. **Consider backward compatibility**
5. **Update related documentation**
