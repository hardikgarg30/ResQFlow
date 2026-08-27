require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixUsersTable() {
  try {
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;"
    );

    console.log("PASSWORD COLUMN ADDED SUCCESSFULLY");
  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    await pool.end();
  }
}

fixUsersTable();