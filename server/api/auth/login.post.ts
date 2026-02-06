import { eq } from 'drizzle-orm'
import { db, users } from '../../database'
import { verifyPassword, createToken, setAuthCookie } from '../../utils/auth'

interface LoginBody {
    email: string
    password: string
}

export default defineEventHandler(async (event) => {
    const body = await readBody<LoginBody>(event)

    // Validate input
    if (!body.email || !body.password) {
        throw createError({
            statusCode: 400,
            message: 'Email and password are required'
        })
    }

    // Find user
    const user = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email.toLowerCase()))
        .get()

    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Invalid email or password'
        })
    }

    // Verify password
    const isValid = await verifyPassword(body.password, user.passwordHash)

    if (!isValid) {
        throw createError({
            statusCode: 401,
            message: 'Invalid email or password'
        })
    }

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
