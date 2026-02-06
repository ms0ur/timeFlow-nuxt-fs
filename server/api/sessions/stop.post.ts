import { eq } from 'drizzle-orm'
import { db, sessions } from '../../database'
import { requireAuth } from '../../utils/auth'

interface StopBody {
    timestamp?: number
    localId?: string
}

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const body = await readBody<StopBody>(event)

    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date()

    // Find and close the current active session
    const activeSession = await db.query.sessions.findFirst({
        where: (s, { eq, and, isNull }) =>
            and(eq(s.userId, auth.userId), isNull(s.endedAt)),
        orderBy: (s, { desc }) => [desc(s.startedAt)]
    })

    if (!activeSession) {
        return { success: true, message: 'No active session to stop' }
    }

    // Close the session
    await db
        .update(sessions)
        .set({ endedAt: timestamp })
        .where(eq(sessions.id, activeSession.id))

    return {
        success: true,
        message: 'Tracking stopped',
        session: {
            ...activeSession,
            endedAt: timestamp
        }
    }
})
