import { env } from "~/utils/env";
import * as schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s trying to connect
});

// Test the database connection
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Test connection on startup
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection test failed:", err);
  } else {
    console.log("Database connected successfully");
  }
});

const database = drizzle(pool, { schema });

/** Type for the database instance */
export type Database = typeof database;

/** Type for a transaction within the database */
export type Transaction = Parameters<
  Parameters<typeof database.transaction>[0]
>[0];

/** Type for database or transaction - use this when a function needs to work with both */
export type DatabaseOrTransaction = Database | Transaction;

export { database, pool };
