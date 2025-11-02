# Migration Guide: Optional MongoDB Environment Variables

## Issue Description

In previous versions of adonis-odm, some MongoDB environment variables (`MONGO_HOST`, `MONGO_PORT`, `MONGO_DATABASE`) were required in the environment validation schema. This caused validation errors when users wanted to use only the `MONGO_URI` approach.

## Error Symptoms

If you're seeing errors like:

```
EnvValidationException: Validation failed for one or more environment variables

Missing environment variable "MONGO_HOST"
Missing environment variable "MONGO_PORT"  
Missing environment variable "MONGO_DATABASE"

at anonymous start/env.ts:11
```

This means your project was configured with the old required validation schema.

## Solution

### Option 1: Update Your Existing start/env.ts File (Recommended)

If you have an existing `start/env.ts` file in your project, update the MongoDB environment variables to be optional:

**Before (Required):**
```typescript
export default await Env.create(new URL('../', import.meta.url), {
  // ... other variables
  
  // MongoDB configuration (OLD - REQUIRED)
  MONGO_HOST: Env.schema.string(),
  MONGO_PORT: Env.schema.number(),
  MONGO_DATABASE: Env.schema.string(),
  MONGO_URI: Env.schema.string.optional(),
  MONGO_USERNAME: Env.schema.string.optional(),
  MONGO_PASSWORD: Env.schema.string.optional(),
  // ... other variables
})
```

**After (Optional):**
```typescript
export default await Env.create(new URL('../', import.meta.url), {
  // ... other variables
  
  // MongoDB configuration (NEW - ALL OPTIONAL)
  MONGO_HOST: Env.schema.string.optional(),
  MONGO_PORT: Env.schema.number.optional(),
  MONGO_DATABASE: Env.schema.string.optional(),
  MONGO_URI: Env.schema.string.optional(),
  MONGO_USERNAME: Env.schema.string.optional(),
  MONGO_PASSWORD: Env.schema.string.optional(),
  // ... other variables
})
```

### Option 2: Reconfigure the Package

If you want to start fresh, you can reconfigure the package:

1. Remove the old configuration from `start/env.ts`
2. Run the configure command again:
   ```bash
   node ace configure adonis-odm
   ```

This will add the updated optional validation schema.

## Configuration Options

Now you can choose between two approaches:

### Approach 1: Use MongoDB URI Only

```env
# .env file
MONGO_URI=mongodb://username:password@localhost:27017/database_name
```

### Approach 2: Use Individual Components

```env
# .env file
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=database_name
MONGO_USERNAME=username
MONGO_PASSWORD=password
```

### Approach 3: Mix Both (URI takes precedence)

```env
# .env file
MONGO_URI=mongodb://username:password@localhost:27017/database_name
MONGO_HOST=localhost  # Will be ignored if URI is provided
MONGO_PORT=27017      # Will be ignored if URI is provided
```

## Benefits

- **Flexibility**: Choose the configuration approach that works best for your setup
- **No Required Variables**: All MongoDB connection variables are now optional
- **Backward Compatibility**: Existing configurations continue to work
- **Simplified Setup**: Use just `MONGO_URI` for simple setups

## Troubleshooting

### Still Getting Validation Errors?

1. **Check your start/env.ts file**: Make sure all MongoDB variables use `.optional()`
2. **Restart your application**: Environment validation is cached
3. **Check for typos**: Ensure variable names match exactly

### Need Help?

If you're still experiencing issues:

1. Check the [Environment Setup Guide](./ENV_SETUP.md)
2. Review the [Docker Setup Guide](./DOCKER_SETUP.md) if using Docker
3. Open an issue on the GitHub repository with your configuration

## Version Information

- **Fixed in**: v0.2.1+
- **Affects**: Projects configured with v0.2.0 and earlier
- **Action Required**: Update your `start/env.ts` file as described above
