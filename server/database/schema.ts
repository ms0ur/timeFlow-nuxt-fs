import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// ============================================
// USERS TABLE
// ============================================
export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name'), // Display name
    accentColor: text('accent_color').default('#6366f1'), // User's preferred accent color
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`)
})

// ============================================
// ACTIVITIES TABLE (Self-referencing tree)
// ============================================
export const activities = sqliteTable('activities', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    parentId: integer('parent_id').references((): ReturnType<typeof integer> => activities.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon').default('i-lucide-circle'),
    color: text('color').default('#6366f1'),
    isDefault: integer('is_default', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`)
})

// ============================================
// SESSIONS TABLE (Time tracking entries)
// ============================================
export const sessions = sqliteTable('sessions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    activityId: integer('activity_id')
        .notNull()
        .references(() => activities.id, { onDelete: 'cascade' }),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp' }), // null = currently active
    description: text('description'), // Optional session notes
    // For offline sync tracking
    localId: text('local_id'), // Client-generated ID for deduplication
    syncedAt: integer('synced_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`)
})

// ============================================
// SYNC EVENTS TABLE (For event-based sync)
// ============================================
export const syncEvents = sqliteTable('sync_events', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    localId: text('local_id').notNull(), // Client-generated event ID
    eventType: text('event_type').notNull(), // 'SWITCH'
    fromActivityId: integer('from_activity_id').references(() => activities.id),
    toActivityId: integer('to_activity_id')
        .notNull()
        .references(() => activities.id),
    eventTimestamp: integer('event_timestamp', { mode: 'timestamp' }).notNull(),
    processedAt: integer('processed_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`)
})

// ============================================
// EMOTIONS TABLE (Mood tracking)
// ============================================
export const emotions = sqliteTable('emotions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: integer('session_id')
        .references(() => sessions.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(), // 1-5 scale
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`)
})

// ============================================
// USER SETTINGS TABLE
// ============================================
export const userSettings = sqliteTable('user_settings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' })
        .unique(),
    weekStartDay: integer('week_start_day').default(1), // 0=Sunday, 1=Monday...6=Saturday
    dayStartHour: integer('day_start_hour').default(0), // 0-23
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`)
})

// ============================================
// TYPE EXPORTS
// ============================================
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Activity = typeof activities.$inferSelect
export type NewActivity = typeof activities.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export type SyncEvent = typeof syncEvents.$inferSelect
export type NewSyncEvent = typeof syncEvents.$inferInsert

export type Emotion = typeof emotions.$inferSelect
export type NewEmotion = typeof emotions.$inferInsert

export type UserSettings = typeof userSettings.$inferSelect
export type NewUserSettings = typeof userSettings.$inferInsert
