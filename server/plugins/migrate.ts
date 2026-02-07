import { migrate } from 'drizzle-orm/libsql/migrator'
import { db } from '../database'

export default defineNitroPlugin(async () => {

    try {
        console.log('Starting automatic database migrations...')
        await migrate(db, { migrationsFolder: 'drizzle' })
        console.log('Automatic database migrations completed successfully')
    } catch (error) {
        console.error('Automatic database migration failed:', error)
    }
})
