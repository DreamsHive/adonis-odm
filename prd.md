## Product Requirements Document: MongoDB ODM for AdonisJS v6

**1. Introduction**

This document outlines the requirements for a MongoDB Object Document Mapper (ODM) for AdonisJS v6. The ODM will provide a simple, yet powerful way to interact with MongoDB databases, following the patterns and conventions established by AdonisJS Lucid ORM. The goal is to offer a familiar and type-safe experience for developers already acquainted with AdonisJS.

**2. Goals**

- Provide a robust and easy-to-use ODM for MongoDB in AdonisJS v6 applications.
- Maintain consistency with AdonisJS Lucid ORM patterns to ensure a low learning curve.
- Enable type-safe schema definition and querying.
- Offer a command-line interface for easy setup and configuration.
- Provide clear and comprehensive documentation.

**3. Target Audience**

AdonisJS developers who want to use MongoDB as their primary database.

**4. Key Features**

**4.1. AdonisJS Provider**

- The ODM will be implemented as an AdonisJS service provider.
- It will register necessary bindings to the IoC container (e.g., database connection, model query builder).
- The provider will be configurable through the `adonisrc.ts` file.
  - Users should be able to register the provider similar to other AdonisJS packages:
    ```typescript
    // adonisrc.ts
    {
      providers: [
        // ...other providers
        () => import('@adonisjs/mongodb-odm/mongodb_provider'), // Example path
      ]
    }
    ```
- The provider should expose lifecycle methods (`register`, `boot`, `start`, `ready`, `shutdown`) for proper initialization and cleanup of resources (e.g., MongoDB connections).

**4.2. BaseModel for ODM**

- A `BaseModel` class, analogous to Lucid's `BaseModel`, will be provided.
- This base class will serve as the foundation for user-defined ODM models.
- It will include common functionalities like:

  - `$isPersisted`: A boolean flag indicating if the model instance exists in the database.
  - `$isLocal`: A boolean flag indicating if the model instance is local and not persisted.
  - `$dirty`: An object tracking modified properties.
  - `save()`: Method to persist or update the model instance in the database.
  - `delete()`: Method to remove the model instance from the database.
  - `fill()`: Method to assign multiple attributes to a model instance.
  - `merge()`: Method to merge new attributes into the existing model instance.
  - Static `query()`: Method to get an instance of the Model Query Builder.

- **Schema Definition with Decorators:**

  - Similar to Lucid, decorators will be used to define model schema and column properties.
  - A `@column` decorator will define a field in the MongoDB document.

    - It should support basic types (String, Number, Boolean, Date, Array, Object).
    - It should allow specifying if a field is a primary key (e.g., `_id`). While MongoDB automatically creates an `_id` field, users might want to define it explicitly or use a different field as the primary identifier internally if needed, though sticking to `_id` is conventional. For simplicity, we will assume `_id` is the primary key and automatically managed unless a different strategy is explicitly chosen (out of scope for this initial version).
    - It should allow defining default values.
    - It should allow specifying if a field is required.
    - It should provide serialization options (e.g., transforming date formats) similar to `@column.date` in Lucid.

      ```typescript
      // app/models/user.ts
      import { DateTime } from 'luxon'
      import { BaseModel, column } from '@adonisjs/mongodb-odm' // ODM specific imports

      export default class User extends BaseModel {
        @column({ isPrimary: true /* other options if needed for _id */ })
        declare _id: string // Or ObjectId, depending on driver and preference

        @column()
        declare username: string

        @column()
        declare email: string

        @column.date({
          serialize: (value: DateTime) => value.toFormat('dd LLL yyyy'),
          // deserialize: (value: Date) => DateTime.fromJSDate(value) // Example
        })
        declare dob: DateTime

        @column.dateTime({ autoCreate: true })
        declare createdAt: DateTime

        @column.dateTime({ autoCreate: true, autoUpdate: true })
        declare updatedAt: DateTime
      }
      ```

  - Timestamps (`createdAt`, `updatedAt`):
    - The `BaseModel` should automatically handle `createdAt` and `updatedAt` timestamps.
    - `@column.dateTime({ autoCreate: true })` for `createdAt`.
    - `@column.dateTime({ autoCreate: true, autoUpdate: true })` for `updatedAt`.

**4.3. Configuration**

- **Ace Configure Command:**

  - An Ace command `node ace configure @adonisjs/mongodb-odm` (or a similar package name) will be provided.
  - This command will:
    - Register the ODM provider in `adonisrc.ts`.
    - Create a default configuration file (e.g., `config/mongo.ts`).
    - Optionally, prompt the user for basic connection details (e.g., `DB_HOST`, `DB_PORT`, `DB_DATABASE`). The command could accept a `--db=mongodb` flag, although this seems redundant if the package is specifically for MongoDB. It's more for Lucid which supports multiple SQL databases.

- **Configuration File (`config/mongo.ts`):**

  - The configuration file will follow a structure similar to `config/database.ts` for Lucid.
  - It will use `defineConfig` for type-safety and structure.
  - It will define connections, allowing for multiple MongoDB connections.
  - The primary connection driver will be for MongoDB (e.g., using the official MongoDB Node.js driver or a higher-level library like Mongoose under the hood, to be decided during implementation. For now, let's assume direct usage of the MongoDB driver for core ODM functionality, keeping it lightweight).

    ```typescript
    // config/mongo.ts
    import env from '#start/env'
    import { defineConfig } from '@adonisjs/mongodb-odm' // ODM specific import

    const mongoConfig = defineConfig({
      connection: env.get('MONGO_CONNECTION', 'mongodb'), // Default connection name
      connections: {
        mongodb: {
          client: 'mongodb', // Or 'mongoose' if that's the chosen underlying library
          connection: {
            url: env.get('MONGO_URL'), // Recommended: use a connection string
            // Alternatively, individual parameters:
            // host: env.get('MONGO_HOST', '127.0.0.1'),
            // port: env.get('MONGO_PORT', 27017),
            // user: env.get('MONGO_USER', ''), // Ignored as per requirement
            // password: env.get('MONGO_PASSWORD', ''), // Ignored
            // database: env.get('MONGO_DATABASE', 'adonis'),
            // options: {} // To pass additional driver options
          },
          // Migrations are typically not used with MongoDB in the same way as SQL.
          // This section might be omitted or adapted if a schema migration strategy is considered later.
          // For now, let's omit it.
          // migrations: {
          //   naturalSort: true,
          //   paths: ['database/mongo_migrations'], // Example path
          // },
          useNewUrlParser: true, // Example driver option
          useUnifiedTopology: true, // Example driver option
        },
        // ... other connections
      },
    })

    export default mongoConfig
    ```

  - MongoDB authentication details (`user`, `password`) will be ignored for this version as per requirements, but the config structure should allow for them to be added easily in the future. Using a MongoDB connection string (`MONGO_URL`) is generally preferred as it can encapsulate auth and other options.

**4.4. CRUD Operations**

- The ODM will provide static and instance methods for common CRUD operations, mirroring Lucid's API.

  - **Create:**

    - `Model.create(data)`: Creates and persists a new document. Returns a model instance.
      ```typescript
      const user = await User.create({
        username: 'virk',
        email: 'virk@adonisjs.com',
        dob: DateTime.now().minus({ years: 30 }),
      })
      ```
    - `Model.createMany(dataArray)`: Creates and persists multiple documents. Returns an array of model instances.
    - `new Model().fill(data).save()`: Creates a new model instance, fills it with data, and then persists it.

  - **Read:**

    - `Model.find(id)`: Finds a document by its `_id`. Returns a model instance or `null`.
    - `Model.findOrFail(id)`: Finds a document by its `_id`. Throws an exception if not found.
    - `Model.findBy(key, value)`: Finds a document by a specific field-value pair. Returns a model instance or `null`.
    - `Model.findByOrFail(key, value)`: Finds a document by a specific field-value pair. Throws an exception if not found.
    - `Model.first()`: Fetches the first document matching the query (usually combined with `query()`). Returns a model instance or `null`.
    - `Model.firstOrFail()`: Fetches the first document matching the query. Throws an exception if not found.
    - `Model.all()`: Fetches all documents for the model's collection. Returns an array of model instances. (Use with caution on large collections; pagination should be preferred).

  - **Update:**

    - `modelInstance.merge(data).save()`: Merges new data into an existing model instance and persists changes.
    - `modelInstance.save()`: Persists any changes made to the model instance.
    - `Model.updateOrCreate(searchPayload, persistencePayload)`: Updates an existing document matching `searchPayload` or creates a new one if not found.
    - `Model.updateMany(criteria, updates)`: (To be considered) Updates multiple documents matching criteria. MongoDB's `updateMany` equivalent.

  - **Delete:**
    - `modelInstance.delete()`: Deletes the document from the database.
    - `Model.query().where(conditions).delete()`: Deletes documents matching query conditions.

**4.5. Model Query Builder**

- `Model.query()` will return an instance of a `ModelQueryBuilder`.
- The `ModelQueryBuilder` will provide methods for building and executing MongoDB queries in a type-safe manner.
- It should support common MongoDB query operations:

  - **Filtering:**
    - `where(key, value)` or `where(key, operator, value)` (e.g., `gt`, `lt`, `in`, `nin`, `exists`, `regex`).
    - `orWhere(key, value)`.
    - `whereNull(key)`, `whereNotNull(key)`.
    - `whereIn(key, arrayOfValues)`.
    - `whereNotIn(key, arrayOfValues)`.
    - `whereBetween(key, [start, end])` (if applicable for MongoDB date/number ranges).
  - **Sorting:**
    - `orderBy(key, direction)` (direction: 'asc' or 'desc').
  - **Pagination:**
    - `limit(number)`.
    - `skip(number)`.
    - `paginate(page, perPage)`: Similar to Lucid, returning pagination metadata and results.
  - **Projections (Selecting Fields):**
    - `select(fieldsArrayOrObject)`: To specify which fields to include or exclude.
      ```typescript
      // Select only username and email
      await User.query().select(['username', 'email']).first()
      // Exclude password (MongoDB style: { password: 0 })
      await User.query().select({ password: 0 }).first()
      ```
  - **Execution Methods:**
    - `exec()`: Executes the query and returns raw driver results (or an array of model instances).
    - `first()`: Executes and returns the first matching document as a model instance or `null`.
    - `firstOrFail()`: Same as `first()`, but throws if no document is found.
    - `all()` or `fetch()`: Executes and returns all matching documents as an array of model instances.
    - `count()`: Returns the count of matching documents.
    - `ids()`: Returns an array of `_id`s for matching documents.

- **Aggregation Pipeline Support (Basic):**

  - While full aggregation pipeline support might be extensive for v1, basic aggregation capabilities like `count()`, `sum()`, `avg()`, `min()`, `max()` on specific fields via the query builder would be valuable.

    ```typescript
    // Example: Get the count of users
    const count = await User.query().count()

    // Example: Get the average age (assuming an 'age' field)
    // const avgAge = await User.query().avg('age')
    ```

  - More complex aggregations can be deferred or allow passing raw aggregation pipeline stages.

**5. Non-Goals / Out of Scope (for initial version)**

- **Model Factories:** For seeding and testing.
- **Serializing Models (Advanced):** Beyond basic `@column` serialization. No complex toJSON/toObject customizations, hidden/visible fields beyond what `@column` provides initially.
- **Hooks (Lifecycle Events):** `beforeSave`, `afterSave`, `beforeDelete`, etc.
- **Relationships:** Defining and managing relationships (`hasOne`, `hasMany`, `belongsTo`, `manyToMany`) between models. This is a significant feature and can be a fast follow.
- **Migrations & Schema Management:** MongoDB is schema-less, but tools like Mongoose provide schema validation. For v1, we rely on the model definitions for schema enforcement at the application level. No dedicated migration system like Lucid's.
- **Transactions:** While MongoDB supports multi-document transactions, integrating this into the ODM's API will be deferred. Users can use the underlying driver directly if transactions are critical.
- **Database Seeding Utilities:** Specific helpers for seeding data.
- **Advanced Query Features:** Full-text search integration, geospatial queries, complex aggregation pipeline builders beyond basic ones.
- **Soft Deletes.**
- **Support for other NoSQL databases.**

**6. Technical Considerations**

- **Underlying MongoDB Driver:**

  - Decision needed: Use the official `mongodb` Node.js driver directly or leverage a library like Mongoose.
  - Using the official driver provides more control and a lighter dependency but requires implementing more abstraction.
  - Mongoose provides schema validation, middleware (hooks), population, and a more mature ecosystem but adds a heavier dependency and its own patterns that might conflict or overlap.
  - **Recommendation for v1:** Start with the official `mongodb` driver to keep the ODM lightweight and closely aligned with AdonisJS principles. Mongoose-like features (schema validation, hooks) can be layered on top or integrated later if deemed necessary.

- **Type Safety:**

  - Leverage TypeScript extensively for type-safe model definitions, query building, and results.
  - Generated types for model instances and query results.

- **Performance:**

  - Ensure efficient query generation and minimal overhead on top of the MongoDB driver.
  - Connection pooling should be handled by the underlying driver, configured via the ODM.

- **Error Handling:**
  - Provide clear and consistent error messages.
  - Map driver-specific errors to user-friendly exceptions where appropriate.

**7. Future Enhancements (Post v1)**

- Model Hooks
- Relationships (hasOne, hasMany, belongsTo, etc. - emulated or using specific MongoDB patterns)
- Model Factories
- Advanced Serialization
- Transactions API
- Schema validation options (potentially integrating with a library like Zod or Joi, or Mongoose-like schema definitions)
- Soft Deletes
- More advanced aggregation pipeline helpers
- Seeding utilities
