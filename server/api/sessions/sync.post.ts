import { eq, and, isNull, inArray } from 'drizzle-orm'
import { db, sessions, activities, syncEvents } from '../../database'
import { requireAuth } from '../../utils/auth'

interface SyncEvent {
    localId: string
    type: 'SWITCH'
    fromActivityId?: number | null
    toActivityId: number
    timestamp: number // Unix timestamp in ms
}

interface SyncBody {
    events: SyncEvent[]
}

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const body = await readBody<SyncBody>(event)

    if (!body.events || !Array.isArray(body.events)) {
        throw createError({
            statusCode: 400,
            message: 'events array is required'
        })
    }

    // Get already processed event IDs to skip duplicates
    const eventLocalIds = body.events.map(e => e.localId)
    const existingEvents = await db
        .select({ localId: syncEvents.localId })
        .from(syncEvents)
        .where(and(
            eq(syncEvents.userId, auth.userId),
            inArray(syncEvents.localId, eventLocalIds)
        ))
        .all()

    const existingLocalIds = new Set(existingEvents.map(e => e.localId))

    // Filter out duplicates and sort by timestamp
    const newEvents = body.events
        .filter(e => !existingLocalIds.has(e.localId))
        .sort((a, b) => a.timestamp - b.timestamp)

    const processedLocalIds: string[] = []

    for (const syncEvent of newEvents) {
        // Verify target activity belongs to user
        const targetActivity = await db
            .select()
            .from(activities)
            .where(and(eq(activities.id, syncEvent.toActivityId), eq(activities.userId, auth.userId)))
            .get()

        if (!targetActivity) {
            continue // Skip invalid activities
        }

        const eventTime = new Date(syncEvent.timestamp)

        // End current active session at event time
        const currentSession = await db
            .select()
            .from(sessions)
            .where(and(eq(sessions.userId, auth.userId), isNull(sessions.endedAt)))
            .get()

        if (currentSession) {
            await db
                .update(sessions)
                .set({ endedAt: eventTime })
                .where(eq(sessions.id, currentSession.id))
        }

        // Start new session
        await db.insert(sessions).values({
            userId: auth.userId,
            activityId: syncEvent.toActivityId,
            startedAt: eventTime,
            localId: syncEvent.localId,
            syncedAt: new Date()
        })

        // Record processed event for deduplication
        await db.insert(syncEvents).values({
            userId: auth.userId,
            localId: syncEvent.localId,
            eventType: syncEvent.type,
            fromActivityId: syncEvent.fromActivityId,
            toActivityId: syncEvent.toActivityId,
            eventTimestamp: eventTime
        })

        processedLocalIds.push(syncEvent.localId)
    }

    return {
        processedLocalIds,
        skippedCount: body.events.length - newEvents.length
    }
})
