import { eq, and, gte, lte } from 'drizzle-orm'
import { db, sessions, activities } from '../../database'
import { requireAuth } from '../../utils/auth'

interface ActivityWithParent {
    id: number
    name: string
    icon: string | null
    color: string | null
    parentId: number | null
}

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const query = getQuery(event)

    // Parse query params
    const startDate = query.start ? new Date(String(query.start)) : new Date(new Date().setHours(0, 0, 0, 0))
    const endDate = query.end ? new Date(String(query.end)) : new Date()
    const maxDepth = query.maxDepth !== undefined ? parseInt(String(query.maxDepth)) : 0
    const includeHourly = query.hourly === 'true'

    // Get all activities for hierarchy resolution
    const allActivities = await db
        .select()
        .from(activities)
        .where(eq(activities.userId, auth.userId))
        .all()

    const activityMap = new Map<number, ActivityWithParent>(
        allActivities.map(a => [a.id, a])
    )

    // Get all sessions in range
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

    // Helper: get activity at specific depth level
    function getActivityAtDepth(activityId: number, depth: number): ActivityWithParent | null {
        if (depth === 0) return activityMap.get(activityId) ?? null

        // Build path from activity to root
        const path: ActivityWithParent[] = []
        let current = activityMap.get(activityId)
        while (current) {
            path.unshift(current)
            current = current.parentId ? activityMap.get(current.parentId) : undefined
        }

        // Return activity at target depth (1-indexed to match levels)
        if (path.length >= depth) {
            return path[depth - 1] ?? null
        }
        // If activity is shallower than target depth, return the activity itself
        return path[path.length - 1] ?? null
    }

    // Aggregate by activity (respecting maxDepth)
    const activityStats = new Map<number, {
        activity: ActivityWithParent,
        totalDuration: number,
        sessionCount: number
    }>()

    for (const session of sessionsWithDuration) {
        const targetActivity = maxDepth > 0
            ? getActivityAtDepth(session.activityId, maxDepth)
            : session.activity

        if (!targetActivity) continue

        const key = targetActivity.id
        const existing = activityStats.get(key)

        if (existing) {
            existing.totalDuration += session.duration
            existing.sessionCount += 1
        } else {
            activityStats.set(key, {
                activity: targetActivity,
                totalDuration: session.duration,
                sessionCount: 1
            })
        }
    }

    // Sort by duration
    const stats = Array.from(activityStats.values())
        .sort((a, b) => b.totalDuration - a.totalDuration)

    const totalDuration = stats.reduce((sum, s) => sum + s.totalDuration, 0)

    // Hourly breakdown (if requested)
    let hourlyBreakdown: Array<{
        hour: number
        duration: number
        activities: Array<{ activityId: number; name: string; color: string; duration: number }>
    }> | undefined

    if (includeHourly) {
        const hourlyMap = new Map<number, {
            duration: number
            activities: Map<number, { name: string; color: string; duration: number }>
        }>()

        for (let h = 0; h < 24; h++) {
            hourlyMap.set(h, { duration: 0, activities: new Map() })
        }

        for (const session of sessionsWithDuration) {
            const startHour = session.startedAt.getHours()
            const hourData = hourlyMap.get(startHour)!

            hourData.duration += session.duration

            const existingActivity = hourData.activities.get(session.activityId)
            if (existingActivity) {
                existingActivity.duration += session.duration
            } else {
                hourData.activities.set(session.activityId, {
                    name: session.activity?.name || 'Unknown',
                    color: session.activity?.color || '#6366f1',
                    duration: session.duration
                })
            }
        }

        hourlyBreakdown = Array.from(hourlyMap.entries())
            .filter(([_, data]) => data.duration > 0)
            .map(([hour, data]) => ({
                hour,
                duration: data.duration,
                activities: Array.from(data.activities.entries()).map(([activityId, info]) => ({
                    activityId,
                    ...info
                }))
            }))
    }

    // Daily breakdown for week/month views
    const dailyMap = new Map<string, {
        totalDuration: number
        activities: Map<number, { name: string; color: string; duration: number }>
    }>()

    for (const session of sessionsWithDuration) {
        const dateKey = session.startedAt.toISOString().split('T')[0]!

        if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, { totalDuration: 0, activities: new Map() })
        }

        const dayData = dailyMap.get(dateKey)!
        dayData.totalDuration += session.duration

        const existing = dayData.activities.get(session.activityId)
        if (existing) {
            existing.duration += session.duration
        } else {
            dayData.activities.set(session.activityId, {
                name: session.activity?.name || 'Unknown',
                color: session.activity?.color || '#6366f1',
                duration: session.duration
            })
        }
    }

    const dailyBreakdown = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
            date,
            totalDuration: data.totalDuration,
            activities: Array.from(data.activities.entries()).map(([activityId, info]) => ({
                activityId,
                ...info
            }))
        }))

    return {
        startDate,
        endDate,
        totalDuration,
        activities: stats,
        sessionCount: sessionsWithDuration.length,
        dailyBreakdown,
        hourlyBreakdown
    }
})
