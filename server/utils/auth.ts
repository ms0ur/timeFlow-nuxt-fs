import { SignJWT, jwtVerify } from 'jose'
import { hash, compare } from 'bcryptjs'
import type { H3Event } from 'h3'
import type { User } from '../database/schema'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-change-in-production'
)

const TOKEN_COOKIE_NAME = 'auth_token'
const TOKEN_EXPIRY = '7d'

export interface JWTPayload {
    userId: number
    email: string
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return hash(password, 12)
}

/**
 * Compare password with hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return compare(password, hashedPassword)
}

/**
 * Create a JWT token for a user
 */
export async function createToken(user: Pick<User, 'id' | 'email'>): Promise<string> {
    const payload: JWTPayload = {
        userId: user.id,
        email: user.email
    }

    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(TOKEN_EXPIRY)
        .sign(JWT_SECRET)
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        return payload as unknown as JWTPayload
    } catch {
        return null
    }
}

/**
 * Set auth cookie on response
 */
export function setAuthCookie(event: H3Event, token: string): void {
    setCookie(event, TOKEN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
    })
}

/**
 * Remove auth cookie (logout)
 */
export function clearAuthCookie(event: H3Event): void {
    deleteCookie(event, TOKEN_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    })
}

/**
 * Get auth token from cookie
 */
export function getAuthToken(event: H3Event): string | undefined {
    return getCookie(event, TOKEN_COOKIE_NAME)
}

/**
 * Get authenticated user from request (throws if not authenticated)
 */
export async function requireAuth(event: H3Event): Promise<JWTPayload> {
    const token = getAuthToken(event)

    if (!token) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized',
            message: 'Authentication required'
        })
    }

    const payload = await verifyToken(token)

    if (!payload) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized',
            message: 'Invalid or expired token'
        })
    }

    return payload
}

/**
 * Get authenticated user from request (returns null if not authenticated)
 */
export async function getAuth(event: H3Event): Promise<JWTPayload | null> {
    const token = getAuthToken(event)
    if (!token) return null
    return verifyToken(token)
}
