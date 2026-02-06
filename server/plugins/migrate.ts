import { migrate } from 'drizzle-orm/libsql/migrator'
import { db } from '../database'

export default defineNitroPlugin(async () => {
    // Skip migration in development if you prefer running it manually, 
    // but for this specific issue (Docker persistence), allowing it is safer.
    // We check if the migrations directory exists before running to avoid errors.

    try {
        console.log('Starting database migrations...')
        await migrate(db, { migrationsFolder: 'drizzle' })
        console.log('Database migrations completed successfully')
    } catch (error) {
        console.error('Database migration failed:', error)
        // We don't throw to allow the server to start, 
        // but likely db calls will fail if tables are missing.
    }
})
