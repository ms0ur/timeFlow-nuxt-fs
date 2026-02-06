import { eq, and } from 'drizzle-orm'
import { db, activities } from '../../database'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const activityId = Number(getRouterParam(event, 'id'))

    if (isNaN(activityId)) {
        throw createError({
            statusCode: 400,
            message: 'Invalid activity ID'
        })
    }

    // Verify activity belongs to user
    const existing = await db
        .select()
        .from(activities)
        .where(and(eq(activities.id, activityId), eq(activities.userId, auth.userId)))
        .get()

    if (!existing) {
        throw createError({
            statusCode: 404,
            message: 'Activity not found'
        })
    }

    // Prevent deletion of default activity
    if (existing.isDefault) {
        throw createError({
            statusCode: 400,
            message: 'Cannot delete the default activity'
        })
    }

    // Delete activity (children will cascade)
    await db.delete(activities).where(eq(activities.id, activityId))

    return { success: true }
})
