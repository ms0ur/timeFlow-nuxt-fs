import { db, emotions } from '../../database'
import { requireAuth } from '../../utils/auth'

interface CreateEmotionBody {
    rating: number // 1-5
    description?: string
    sessionId?: number
}

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const body = await readBody<CreateEmotionBody>(event)

    // Validate rating
    if (!body.rating || body.rating < 1 || body.rating > 5) {
        throw createError({
            statusCode: 400,
            message: 'Rating must be between 1 and 5'
        })
    }

    const result = await db
        .insert(emotions)
        .values({
            userId: auth.userId,
            rating: body.rating,
            description: body.description?.trim() || null,
            sessionId: body.sessionId || null
        })
        .returning()

    return { emotion: result[0] }
})
