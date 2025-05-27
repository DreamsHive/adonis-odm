import { createAccountValidator } from '#validators/crud'

import Profile from '#models/profile'
import UserWithReferencedProfile from '#models/user_with_referenced_profile'

// Types
import type { HttpContext } from '@adonisjs/core/http'

export default class CrudsController {
  public async create({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createAccountValidator)

    // Create user with the validated payload
    const user = await UserWithReferencedProfile.create({
      email: payload.email,
      encryptedPassword: payload.password,
    })

    // Create the associated profile
    const profile = await Profile.create({
      userId: user._id,
      firstName: payload.first_name,
      lastName: payload.last_name,
      bio: payload.bio,
    })

    const loadAfterCreate = await UserWithReferencedProfile.query()
      .load('profile')
      .where('_id', user._id)
      .first()

    // Return the created user with profile
    return response.status(201).json(loadAfterCreate)
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
