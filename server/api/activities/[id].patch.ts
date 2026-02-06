import { eq, and } from 'drizzle-orm'
import { db, activities } from '../../database'
import { requireAuth } from '../../utils/auth'

interface UpdateActivityBody {
    name?: string
    parentId?: number | null
    icon?: string
    color?: string
    isDefault?: boolean
}

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const activityId = Number(getRouterParam(event, 'id'))
    const body = await readBody<UpdateActivityBody>(event)

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

    // If setting this as default, unset other defaults first
    if (body.isDefault === true) {
        await db
            .update(activities)
            .set({ isDefault: false })
            .where(and(eq(activities.userId, auth.userId), eq(activities.isDefault, true)))
    }

    const result = await db
        .update(activities)
        .set({
            ...(body.name !== undefined && { name: body.name.trim() }),
            ...(body.parentId !== undefined && { parentId: body.parentId }),
            ...(body.icon !== undefined && { icon: body.icon }),
            ...(body.color !== undefined && { color: body.color }),
            ...(body.isDefault !== undefined && { isDefault: body.isDefault })
        })
        .where(eq(activities.id, activityId))
        .returning()

    return { activity: result[0] }
})
