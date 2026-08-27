require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  try {
    const hash = await bcrypt.hash("test123", 10);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2",
      [hash, "riya_test_456@gmail.com"]
    );

    console.log("PASSWORD RESET SUCCESSFULLY");
  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    await pool.end();
  }
})();
