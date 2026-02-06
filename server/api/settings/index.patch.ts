import { eq } from 'drizzle-orm'
import { db, users } from '../../database'
import { requireAuth } from '../../utils/auth'

interface UpdateSettingsBody {
    name?: string
    accentColor?: string
}

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const body = await readBody<UpdateSettingsBody>(event)

    const updates: Partial<{ name: string | null; accentColor: string }> = {}

    if (body.name !== undefined) {
        updates.name = body.name?.trim() || null
    }

    if (body.accentColor) {
        // Validate color format
        if (/^#[0-9A-Fa-f]{6}$/.test(body.accentColor)) {
            updates.accentColor = body.accentColor
        }
    }

    if (Object.keys(updates).length === 0) {
        return { success: true, message: 'No updates' }
    }

    const result = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, auth.userId))
        .returning()

    if (!result.length) {
        throw createError({
            statusCode: 404,
            message: 'User not found'
        })
    }

    const updatedUser = result[0]!

    return {
        success: true,
        user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            accentColor: updatedUser.accentColor
        }
    }
})
