import { eq, and } from 'drizzle-orm'
import { db, emotions } from '../../database'
import { requireAuth } from '../../utils/auth'

interface UpdateEmotionBody {
    rating?: number
    description?: string
}

export default defineEventHandler(async (event) => {
    const auth = await requireAuth(event)
    const id = parseInt(getRouterParam(event, 'id') || '')
    const body = await readBody<UpdateEmotionBody>(event)

    if (isNaN(id)) {
        throw createError({
            statusCode: 400,
            message: 'Invalid emotion ID'
        })
    }

    // Validate rating if provided
    if (body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
        throw createError({
            statusCode: 400,
            message: 'Rating must be between 1 and 5'
        })
    }

    // Check ownership
    const existing = await db
        .select()
        .from(emotions)
        .where(and(
            eq(emotions.id, id),
            eq(emotions.userId, auth.userId)
        ))
        .get()

    if (!existing) {
        throw createError({
            statusCode: 404,
            message: 'Emotion not found'
        })
    }

    // Update
    const result = await db
        .update(emotions)
        .set({
            rating: body.rating ?? existing.rating,
            description: body.description !== undefined ? body.description : existing.description
        })
        .where(eq(emotions.id, id))
        .returning()

    return { emotion: result[0] }
})
