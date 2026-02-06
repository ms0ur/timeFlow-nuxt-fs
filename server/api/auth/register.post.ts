import { eq } from 'drizzle-orm'
import { db, users, activities } from '../../database'
import { hashPassword, createToken, setAuthCookie } from '../../utils/auth'

interface RegisterBody {
    email: string
    password: string
}

export default defineEventHandler(async (event) => {
    const body = await readBody<RegisterBody>(event)

    // Validate input
    if (!body.email || !body.password) {
        throw createError({
            statusCode: 400,
            message: 'Email and password are required'
        })
    }

    if (body.password.length < 8) {
        throw createError({
            statusCode: 400,
            message: 'Password must be at least 8 characters'
        })
    }

    // Check if user exists
    const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email.toLowerCase()))
        .get()

    if (existingUser) {
        throw createError({
            statusCode: 409,
            message: 'User with this email already exists'
        })
    }

    // Hash password and create user
    const passwordHash = await hashPassword(body.password)

    const result = await db
        .insert(users)
        .values({
            email: body.email.toLowerCase(),
            passwordHash
        })
        .returning()

    const user = result[0]

    if (!user) {
        throw createError({
            statusCode: 500,
            message: 'Failed to create user'
        })
    }

    // Create default "Idle" activity for new user
    await db.insert(activities).values({
        userId: user.id,
        name: 'Idle',
        icon: 'i-lucide-coffee',
        color: '#6b7280',
        isDefault: true
    })

    // Create and set auth token
    const token = await createToken(user)
    setAuthCookie(event, token)

    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            accentColor: user.accentColor,
            createdAt: user.createdAt
        }
    }
})
