import { db, activities } from '../../database'
import { requireAuth } from '../../utils/auth'

interface CreateActivityBody {
    name: string
    parentId?: number | null
    icon?: string
    color?: string
}

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const body = await readBody<CreateActivityBody>(event)

    if (!body.name || body.name.trim().length === 0) {
        throw createError({
            statusCode: 400,
            message: 'Activity name is required'
        })
    }

    const result = await db
        .insert(activities)
        .values({
            userId: auth.userId,
            name: body.name.trim(),
            parentId: body.parentId ?? null,
            icon: body.icon || 'i-lucide-circle',
            color: body.color || '#6366f1'
        })
        .returning()

    return { activity: result[0] }
})
