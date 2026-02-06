import { eq, isNull, and } from 'drizzle-orm'
import { db, sessions, activities } from '../../database'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)

    // Get current active session (endedAt is null)
    const currentSession = await db
        .select({
            id: sessions.id,
            activityId: sessions.activityId,
            startedAt: sessions.startedAt,
            activity: {
                id: activities.id,
                name: activities.name,
                icon: activities.icon,
                color: activities.color
            }
        })
        .from(sessions)
        .leftJoin(activities, eq(sessions.activityId, activities.id))
        .where(and(eq(sessions.userId, auth.userId), isNull(sessions.endedAt)))
        .get()

    return { session: currentSession }
})
