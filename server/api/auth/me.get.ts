import { eq } from 'drizzle-orm'
import { db, users } from '../../database'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)

    const user = await db
        .select({
            id: users.id,
            email: users.email,
            name: users.name,
            accentColor: users.accentColor,
            createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.id, auth.userId))
        .get()

    if (!user) {
        throw createError({
            statusCode: 404,
            message: 'User not found'
        })
    }

    return { user }
})
