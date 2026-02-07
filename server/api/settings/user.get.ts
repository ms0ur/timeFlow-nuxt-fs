import { eq } from 'drizzle-orm'
import { db, userSettings } from '../../database'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)

    const settings = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, auth.userId))
        .get()

    // Return defaults if no settings exist
    if (!settings) {
        return {
            settings: {
                weekStartDay: 1, // Monday
                dayStartHour: 0  // Midnight
            }
        }
    }

    return {
        settings: {
            weekStartDay: settings.weekStartDay,
            dayStartHour: settings.dayStartHour
        }
    }
})
