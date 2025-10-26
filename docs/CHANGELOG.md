# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Environment Variables**: Made all MongoDB connection environment variables optional in the configuration schema
  - `MONGO_HOST`, `MONGO_PORT`, and `MONGO_DATABASE` are now optional instead of required
  - Users can now choose between URI-only configuration (`MONGO_URI`) or granular configuration
  - Resolves validation errors when users prefer to use only `MONGO_URI`
  - Added migration guide for existing projects: `docs/MIGRATION_ENV_VARIABLES.md`

### Changed

- Updated documentation to clarify that all MongoDB environment variables are optional
- Enhanced environment setup guide with multiple configuration approaches

## [0.1.0] - 2025-01-XX

### Added

- Initial release of AdonisJS MongoDB ODM
- BaseModel with Lucid-style API
- Type-safe query builder with method chaining
- Support for embedded documents (single and many)
- Support for referenced relationships (HasOne, HasMany, BelongsTo)
- Transaction support with MongoDB sessions
- Automatic relationship loading (eager loading)
- Type-safe relationship loading with IntelliSense
- Embedded document querying and filtering
- Hooks system (beforeSave, afterSave, beforeCreate, etc.)
- Naming strategy for field/column mapping
- Comprehensive decorators (@column, @dateColumn, hooks)
- Exception handling (ModelNotFoundException, ConnectionException, etc.)
- Utility helpers for nested document operations
- Full TypeScript support with type inference
- Package configuration script for easy setup

### Features

- **Lucid-style API**: Familiar query builder interface for AdonisJS developers
- **Type Safety**: Full TypeScript support with automatic type inference
- **Embedded Documents**: Native support for MongoDB embedded documents
- **Relationships**: Type-safe referenced relationships with bulk loading
- **Transactions**: MongoDB transaction support with session management
- **Hooks**: Comprehensive lifecycle hooks for models
- **Query Builder**: Powerful query builder with filtering, sorting, pagination
- **Naming Strategy**: Flexible field naming conventions
- **Error Handling**: Comprehensive exception system

### Documentation

- Complete README with usage examples
- Type-safe relationship documentation
- Transaction usage examples
- Embedded document guides
- Hook system documentation
