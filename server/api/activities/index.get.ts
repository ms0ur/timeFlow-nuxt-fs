import { eq } from 'drizzle-orm'
import { db, activities } from '../../database'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)

    const userActivities = await db
        .select()
        .from(activities)
        .where(eq(activities.userId, auth.userId))
        .all()

    return { activities: userActivities }
})
