import { eq } from 'drizzle-orm'
import { db, userSettings } from '../../database'
import { requireAuth } from '../../utils/auth'

interface UpdateSettingsBody {
    weekStartDay?: number // 0-6 (Sunday-Saturday)
    dayStartHour?: number // 0-23
}

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const body = await readBody<UpdateSettingsBody>(event)

    // Validate weekStartDay
    if (body.weekStartDay !== undefined && (body.weekStartDay < 0 || body.weekStartDay > 6)) {
        throw createError({
            statusCode: 400,
            message: 'weekStartDay must be between 0 (Sunday) and 6 (Saturday)'
        })
    }

    // Validate dayStartHour
    if (body.dayStartHour !== undefined && (body.dayStartHour < 0 || body.dayStartHour > 23)) {
        throw createError({
            statusCode: 400,
            message: 'dayStartHour must be between 0 and 23'
        })
    }

    // Check if settings exist
    const existing = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, auth.userId))
        .get()

    if (existing) {
        // Update existing
        const result = await db
            .update(userSettings)
            .set({
                weekStartDay: body.weekStartDay ?? existing.weekStartDay,
                dayStartHour: body.dayStartHour ?? existing.dayStartHour,
                updatedAt: new Date()
            })
            .where(eq(userSettings.userId, auth.userId))
            .returning()

        return { settings: result[0] }
    } else {
        // Create new
        const result = await db
            .insert(userSettings)
            .values({
                userId: auth.userId,
                weekStartDay: body.weekStartDay ?? 1,
                dayStartHour: body.dayStartHour ?? 0
            })
            .returning()

        return { settings: result[0] }
    }
})
