# Documentation

This folder contains all the documentation for the AdonisJS MongoDB ODM package, organized by topic and development phase.

## 📁 Documentation Structure

### Core Documentation

- **[TASKS.md](./TASKS.md)** - Complete project roadmap and task tracking
- **[ERROR_HANDLING_SUMMARY.md](./ERROR_HANDLING_SUMMARY.md)** - Comprehensive error handling implementation guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Overall implementation summary
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes
- **[LICENSE.md](../LICENSE.md)** - MIT license information (located in root directory)

### Feature Documentation

- **[SEAMLESS_TYPE_SAFETY.md](./SEAMLESS_TYPE_SAFETY.md)** - Type safety implementation
- **[SEAMLESS_TYPE_SAFETY_ACHIEVEMENT.md](./SEAMLESS_TYPE_SAFETY_ACHIEVEMENT.md)** - Type safety achievements
- **[SEAMLESS_TYPE_SAFETY_SOLUTION.md](./SEAMLESS_TYPE_SAFETY_SOLUTION.md)** - Type safety solutions
- **[SEAMLESS_LUCID_IMPLEMENTATION.md](./SEAMLESS_LUCID_IMPLEMENTATION.md)** - Lucid-style API implementation
- **[TYPE_SAFE_LOAD_CALLBACKS.md](./TYPE_SAFE_LOAD_CALLBACKS.md)** - Type-safe relationship loading
- **[TYPE_SAFE_LOAD_METHOD.md](./TYPE_SAFE_LOAD_METHOD.md)** - Type-safe load method implementation
- **[LUCID_STYLE_DECORATORS.md](./LUCID_STYLE_DECORATORS.md)** - Decorator system documentation
- **[LUCID_API_IMPROVEMENTS.md](./LUCID_API_IMPROVEMENTS.md)** - API improvements and enhancements

### Transaction System

- **[TRANSACTIONS_PRD.md](./TRANSACTIONS_PRD.md)** - Transaction system PRD
- **[TRANSACTIONS_TSD.md](./TRANSACTIONS_TSD.md)** - Transaction system technical specification
- **[TRANSACTION_EXAMPLES.md](./TRANSACTION_EXAMPLES.md)** - Transaction usage examples
- **[README_TRANSACTIONS.md](./README_TRANSACTIONS.md)** - Transaction system overview

### Hooks System

- **[HOOKS_PRD.md](./HOOKS_PRD.md)** - Hooks system PRD
- **[HOOKS_TSD.md](./HOOKS_TSD.md)** - Hooks system technical specification

### Document Management

- **[NESTED_DOCUMENTS.md](./NESTED_DOCUMENTS.md)** - Nested document handling
- **[EMBEDDED_CRUD_OPERATIONS.md](./EMBEDDED_CRUD_OPERATIONS.md)** - Embedded document CRUD operations
- **[BULK_LOADING_IMPLEMENTATION.md](./BULK_LOADING_IMPLEMENTATION.md)** - Bulk loading and N+1 prevention
- **[REFERENCE_PROXY_SYSTEM.md](./REFERENCE_PROXY_SYSTEM.md)** - Reference proxy system

### Setup and Configuration

- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Docker setup instructions
- **[DOCKER_SETUP_COMPLETE.md](./DOCKER_SETUP_COMPLETE.md)** - Docker setup completion guide
- **[MONGODB_CONFIG.md](./MONGODB_CONFIG.md)** - MongoDB configuration guide
- **[ENV_SETUP.md](./ENV_SETUP.md)** - Environment setup instructions
- **[GITIGNORE.md](./GITIGNORE.md)** - Git ignore configuration and best practices

### Testing

- **[TESTING.md](./TESTING.md)** - Testing strategy and implementation

### Development

- **[prd.md](./prd.md)** - Product Requirements Document

## 🚀 Quick Start

For getting started with the package, see the main [README.md](../README.md) in the root directory.

## 📋 Development Workflow

1. **Planning**: Check [TASKS.md](./TASKS.md) for current roadmap and progress
2. **Implementation**: Follow technical specifications in respective TSD files
3. **Testing**: Use guidelines from [TESTING.md](./TESTING.md)
4. **Documentation**: Update relevant documentation files when making changes

## 🔧 Package Structure

The documentation is organized separately from the package build to keep the distributed package lean:

- **Included in package**: Only essential files (README.md, LICENSE.md, build/, configure files)
- **Excluded from package**: All documentation (docs/), development scripts (scripts/), examples
- **Build configuration**: Configured in `package.json` files field and `tsconfig.json` exclude

## 📝 Contributing

When contributing to the project:

1. Update relevant documentation files in this folder
2. Keep the main README.md focused on usage and getting started
3. Use the appropriate documentation file for detailed technical information
4. Follow the existing documentation structure and formatting

## 🏗️ Architecture Overview

The package implements a comprehensive MongoDB ODM with:

- **Lucid-style API** - Familiar AdonisJS patterns
- **Type Safety** - Full TypeScript support with relationship inference
- **Transaction Support** - MongoDB transactions with proper error handling
- **Embedded Documents** - First-class support for embedded document patterns
- **Relationship Loading** - Efficient relationship loading with N+1 prevention
- **Hook System** - Model lifecycle hooks for business logic
- **Error Handling** - Comprehensive error handling with custom exceptions

For detailed implementation information, see the respective documentation files above.
