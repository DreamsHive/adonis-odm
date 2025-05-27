import { createAccountValidator } from '#validators/crud'

import Profile from '#models/profile'
import UserWithReferencedProfile from '#models/user_with_referenced_profile'
import db from '#services/mongodb_service'

// Types
import type { HttpContext } from '@adonisjs/core/http'

export default class CrudsController {
  public async create({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createAccountValidator)

    // Use managed transaction to ensure atomicity
    const result = await db.transaction(async (trx) => {
      console.log('🔄 Starting transaction for user creation...')

      // Create user with the validated payload within transaction
      const user = await UserWithReferencedProfile.create(
        {
          email: payload.email,
          encryptedPassword: payload.password,
        },
        { client: trx }
      )

      console.log('✅ User created:', user._id)

      // Create the associated profile within the same transaction
      const profile = await Profile.create(
        {
          userId: user._id,
          firstName: payload.first_name,
          lastName: payload.last_name,
          bio: payload.bio,
        },
        { client: trx }
      )

      console.log('✅ Profile created:', profile._id)

      // Load the user with profile within the transaction
      const loadAfterCreate = await UserWithReferencedProfile.query({ client: trx })
        .load('profile')
        .where('_id', user._id)
        .first()

      console.log('✅ Transaction completed successfully')
      return loadAfterCreate
    })

    // Return the created user with profile
    return response.status(201).json(result)
  }

  public async createWithoutTransaction({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createAccountValidator)

    console.log('🔄 Creating user without transaction...')

    // Create user with the validated payload (no transaction)
    const user = await UserWithReferencedProfile.create({
      email: payload.email,
      encryptedPassword: payload.password,
    })

    console.log('✅ User created:', user._id)

    // Create the associated profile (no transaction)
    const profile = await Profile.create({
      userId: user._id,
      firstName: payload.first_name,
      lastName: payload.last_name,
      bio: payload.bio,
    })

    console.log('✅ Profile created:', profile._id)

    // Load the user with profile
    const loadAfterCreate = await UserWithReferencedProfile.query()
      .load('profile')
      .where('_id', user._id)
      .first()

    console.log('✅ Creation completed without transaction')

    // Return the created user with profile
    return response.status(201).json(loadAfterCreate)
  }

  public async testManualTransaction({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createAccountValidator)

    // Manual transaction example
    const trx = await db.transaction()

    try {
      console.log('🔄 Starting manual transaction...')

      // Create user with manual transaction
      const user = await UserWithReferencedProfile.create(
        {
          email: payload.email,
          encryptedPassword: payload.password,
        },
        { client: trx }
      )

      console.log('✅ User created:', user._id)

      // Create the associated profile
      const profile = await Profile.create(
        {
          userId: user._id,
          firstName: payload.first_name,
          lastName: payload.last_name,
          bio: payload.bio,
        },
        { client: trx }
      )

      console.log('✅ Profile created:', profile._id)

      // Manually commit the transaction
      await trx.commit()
      console.log('✅ Manual transaction committed successfully')

      // Load the user with profile (outside transaction since it's committed)
      const loadAfterCreate = await UserWithReferencedProfile.query()
        .load('profile')
        .where('_id', user._id)
        .first()

      return response.status(201).json(loadAfterCreate)
    } catch (error) {
      // Manually rollback on error
      await trx.rollback()
      console.error('❌ Manual transaction rolled back:', error)
      return response.status(500).json({ error: 'Transaction failed', details: error.message })
    }
  }

  public async debug({ response }: HttpContext) {
    try {
      // Create test data
      const user = await UserWithReferencedProfile.create({
        email: 'debug@test.com',
      })

      const profile = await Profile.create({
        userId: user._id,
        firstName: 'Debug',
        lastName: 'User',
        bio: 'Test bio',
      })

      // Test relationship loading
      const loadedUser = await UserWithReferencedProfile.query()
        .load('profile')
        .where('_id', user._id)
        .first()

      const debugInfo = {
        user: {
          _id: user._id,
        },
        profile: {
          _id: profile._id,
          userId: profile.userId,
          fullName: profile.fullName,
        },
        loadedUser: {
          exists: !!loadedUser,
          _id: loadedUser?._id,
          profile: {
            exists: !!loadedUser?.profile,
            isLoaded: loadedUser?.profile?.isLoaded,
            related: !!loadedUser?.profile?.related,
            fullName: loadedUser?.profile?.fullName,
          },
          computedProperties: {
            fullName: loadedUser?.fullName,
            formattedAddress: loadedUser?.formattedAddress,
          },
        },
        json: loadedUser?.toJSON(),
      }

      return response.json(debugInfo)
    } catch (error) {
      return response.status(500).json({ error: error.message })
    }
  }
}
