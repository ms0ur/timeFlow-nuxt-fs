import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { db, sessions, activities } from '../../database'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const query = getQuery(event)

    // Parse date range from query params
    const startDate = query.start ? new Date(String(query.start)) : new Date(new Date().setHours(0, 0, 0, 0))
    const endDate = query.end ? new Date(String(query.end)) : new Date()

    // Get all sessions in range with activity info
    const sessionsInRange = await db
        .select({
            id: sessions.id,
            activityId: sessions.activityId,
            startedAt: sessions.startedAt,
            endedAt: sessions.endedAt,
            activity: {
                id: activities.id,
                name: activities.name,
                icon: activities.icon,
                color: activities.color,
                parentId: activities.parentId
            }
        })
        .from(sessions)
        .leftJoin(activities, eq(sessions.activityId, activities.id))
        .where(and(
            eq(sessions.userId, auth.userId),
            gte(sessions.startedAt, startDate),
            lte(sessions.startedAt, endDate)
        ))
        .all()

    // Calculate duration for each session
    const now = new Date()
    const sessionsWithDuration = sessionsInRange.map(session => ({
        ...session,
        duration: session.endedAt
            ? session.endedAt.getTime() - session.startedAt.getTime()
            : now.getTime() - session.startedAt.getTime()
    }))

    // Aggregate by activity
    const activityStats = new Map<number, {
        activity: typeof sessionsWithDuration[0]['activity'],
        totalDuration: number,
        sessionCount: number
    }>()

    for (const session of sessionsWithDuration) {
        const activityId = session.activityId
        const existing = activityStats.get(activityId)

        if (existing) {
            existing.totalDuration += session.duration
            existing.sessionCount += 1
        } else {
            activityStats.set(activityId, {
                activity: session.activity,
                totalDuration: session.duration,
                sessionCount: 1
            })
        }
    }

    // Convert to array and sort by total duration
    const stats = Array.from(activityStats.values())
        .sort((a, b) => b.totalDuration - a.totalDuration)

    const totalDuration = stats.reduce((sum, s) => sum + s.totalDuration, 0)

    return {
        startDate,
        endDate,
        totalDuration,
        activities: stats,
        sessionCount: sessionsWithDuration.length
    }
})
