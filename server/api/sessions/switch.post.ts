import { eq, isNull, and } from 'drizzle-orm'
import { db, sessions, activities } from '../../database'
import { requireAuth } from '../../utils/auth'

interface SwitchBody {
    toActivityId: number
    timestamp?: number // Unix timestamp in ms, for offline sync
    localId?: string // Client-generated ID for deduplication
}

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const body = await readBody<SwitchBody>(event)

    if (!body.toActivityId) {
        throw createError({
            statusCode: 400,
            message: 'toActivityId is required'
        })
    }

    // Verify target activity belongs to user
    const targetActivity = await db
        .select()
        .from(activities)
        .where(and(eq(activities.id, body.toActivityId), eq(activities.userId, auth.userId)))
        .get()

    if (!targetActivity) {
        throw createError({
            statusCode: 404,
            message: 'Target activity not found'
        })
    }

    const now = body.timestamp ? new Date(body.timestamp) : new Date()

    // End current active session
    const currentSession = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.userId, auth.userId), isNull(sessions.endedAt)))
        .get()

    if (currentSession) {
        await db
            .update(sessions)
            .set({ endedAt: now })
            .where(eq(sessions.id, currentSession.id))
    }

    // Start new session
    const newSession = await db
        .insert(sessions)
        .values({
            userId: auth.userId,
            activityId: body.toActivityId,
            startedAt: now,
            localId: body.localId,
            syncedAt: new Date()
        })
        .returning()

    return {
        previousSession: currentSession
            ? { ...currentSession, endedAt: now }
            : null,
        currentSession: {
            ...newSession[0],
            activity: targetActivity
        }
    }
})
