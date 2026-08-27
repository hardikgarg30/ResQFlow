require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT id, name, email,
             password_hash IS NOT NULL AS has_password
      FROM users
      ORDER BY id
    `);

    console.table(result.rows);
  } catch (error) {
    console.error("DB ERROR:", error.message);
  } finally {
    await pool.end();
  }
})();
