/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

const envFile = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "little_treasures_db",
  });

  try {
    const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
    if (!tables.length) {
      throw new Error("The users table is missing. Run scripts/init-db.sql before this migration.");
    }

    const [columns] = await connection.query("SHOW COLUMNS FROM users");
    const existingColumns = new Set(columns.map((column) => column.Field));
    const additions = [
      ["email_verified", "TINYINT(1) NOT NULL DEFAULT 1 AFTER mobile"],
      ["account_status", "ENUM('active','suspended') NOT NULL DEFAULT 'active' AFTER email_verified"],
      ["session_version", "INT UNSIGNED NOT NULL DEFAULT 0 AFTER account_status"],
    ];

    for (const [name, definition] of additions) {
      if (!existingColumns.has(name)) {
        await connection.query(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
      }
    }

    // Canonicalize legacy 10-digit Indian numbers before enforcing uniqueness.
    await connection.query(
      "UPDATE users SET mobile = CONCAT('+91', mobile) WHERE mobile REGEXP '^[6-9][0-9]{9}$'",
    );
    const [duplicateMobiles] = await connection.query(
      "SELECT mobile FROM users WHERE mobile IS NOT NULL AND mobile <> '' GROUP BY mobile HAVING COUNT(*) > 1",
    );
    for (const duplicate of duplicateMobiles) {
      const [duplicateUsers] = await connection.query(
        "SELECT id FROM users WHERE mobile = ? ORDER BY id",
        [duplicate.mobile],
      );
      for (const user of duplicateUsers.slice(1)) {
        await connection.query("UPDATE users SET mobile = NULL WHERE id = ?", [user.id]);
        console.warn(`Cleared duplicate mobile ${duplicate.mobile} from user ${user.id}; the earliest account keeps it.`);
      }
    }
    const [userIndexes] = await connection.query("SHOW INDEX FROM users");
    if (!userIndexes.some((index) => index.Key_name === "uq_users_mobile")) {
      await connection.query("ALTER TABLE users ADD UNIQUE KEY uq_users_mobile (mobile)");
    }

    await connection.query(`CREATE TABLE IF NOT EXISTS auth_email_verification_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME(3) NOT NULL,
      used_at DATETIME(3) DEFAULT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_auth_email_token_hash (token_hash),
      KEY idx_auth_email_token_user (user_id, used_at, expires_at),
      CONSTRAINT fk_auth_email_token_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await connection.query(`CREATE TABLE IF NOT EXISTS auth_password_reset_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME(3) NOT NULL,
      used_at DATETIME(3) DEFAULT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_auth_password_token_hash (token_hash),
      KEY idx_auth_password_token_user (user_id, used_at, expires_at),
      CONSTRAINT fk_auth_password_token_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await connection.query(`CREATE TABLE IF NOT EXISTS auth_rate_limits (
      action VARCHAR(32) NOT NULL,
      subject_hash CHAR(64) NOT NULL,
      window_started_at DATETIME(3) NOT NULL,
      attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
      blocked_until DATETIME(3) DEFAULT NULL,
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (action, subject_hash),
      KEY idx_auth_rate_limit_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    console.log("Authentication migration applied. Existing user records were preserved.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Authentication migration failed:", error.code || error.message);
  process.exitCode = 1;
});
