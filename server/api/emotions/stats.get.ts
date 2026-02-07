import { eq, and, gte, lte, avg, count, sql } from 'drizzle-orm'
import { db, emotions } from '../../database'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const query = getQuery(event)

    // Date range for stats
    const from = query.from ? new Date(query.from as string) : new Date(new Date().setHours(0, 0, 0, 0))
    const to = query.to ? new Date(query.to as string) : new Date()

    // Get average rating
    const avgResult = await db
        .select({
            average: avg(emotions.rating),
            total: count()
        })
        .from(emotions)
        .where(and(
            eq(emotions.userId, auth.userId),
            gte(emotions.createdAt, from),
            lte(emotions.createdAt, to)
        ))
        .get()

    // Get distribution (count per rating)
    const distribution = await db
        .select({
            rating: emotions.rating,
            count: count()
        })
        .from(emotions)
        .where(and(
            eq(emotions.userId, auth.userId),
            gte(emotions.createdAt, from),
            lte(emotions.createdAt, to)
        ))
        .groupBy(emotions.rating)
        .all()

    // Create distribution map (1-5)
    const distributionMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const d of distribution) {
        distributionMap[d.rating] = d.count
    }

    return {
        stats: {
            average: avgResult?.average ? parseFloat(avgResult.average as string) : null,
            total: avgResult?.total || 0,
            distribution: distributionMap
        }
    }
})
