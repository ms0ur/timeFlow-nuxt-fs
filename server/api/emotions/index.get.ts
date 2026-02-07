import { eq, desc, and, gte, lte } from 'drizzle-orm'
import { db, emotions } from '../../database'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const query = getQuery(event)

    // Optional date filters
    const from = query.from ? new Date(query.from as string) : undefined
    const to = query.to ? new Date(query.to as string) : undefined
    const limit = query.limit ? parseInt(query.limit as string) : 50

    let conditions = [eq(emotions.userId, auth.userId)]

    if (from) {
        conditions.push(gte(emotions.createdAt, from))
    }
    if (to) {
        conditions.push(lte(emotions.createdAt, to))
    }

    const userEmotions = await db
        .select()
        .from(emotions)
        .where(and(...conditions))
        .orderBy(desc(emotions.createdAt))
        .limit(limit)
        .all()

    return { emotions: userEmotions }
})
