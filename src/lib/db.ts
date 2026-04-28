import { neon } from '@neondatabase/serverless';

// Create a reusable Neon client using the connection string from environment variables
// This client is optimized for serverless environments and handles connection pooling internally
const sql = neon(process.env.DATABASE_URL!);

// Export the sql function for executing queries
// Usage: await sql`SELECT * FROM users WHERE id = ${userId}`
export { sql };