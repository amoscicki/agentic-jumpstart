import dotenv from "dotenv";
import path from "path";
import pg from "pg";

// Load test environment variables (must use .env.test for correct DATABASE_URL_TEST)
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

async function globalTeardown() {
  console.log("🧹 Cleaning up test database connections...");

  // Create a connection to close any remaining connections
  const connectionString =
    process.env.DATABASE_URL_TEST ||
    "postgresql://postgres:example@localhost:5433/postgres";

  const pool = new pg.Pool({
    connectionString,
  });

  try {
    // Optionally, you can clear the database here as well
    // But it's better to do it in setup to ensure clean state

    console.log("✅ Test database teardown complete!");
  } catch (error) {
    console.error("❌ Error during teardown:", error);
  } finally {
    await pool.end();
  }
}

export default globalTeardown;
