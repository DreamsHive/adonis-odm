import vine, { SimpleMessagesProvider } from '@vinejs/vine'

export const createAccountValidator = vine.compile(
  vine.object({
    first_name: vine.string(),
    last_name: vine.string(),
    email: vine.string(),
    bio: vine.string().optional(),
    password: vine.string(),
  })
)

createAccountValidator.messagesProvider = new SimpleMessagesProvider({
  required: '{{ field }} field is required',
})
