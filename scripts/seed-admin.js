/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");
const fs = require("node:fs");
const mysql = require("mysql2/promise");
const path = require("node:path");

const envFile = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

async function main() {
  const adminEmail = (process.env.INIT_ADMIN_EMAIL || "aartidhuri12@gmail.com").trim().toLowerCase();
  const adminPassword = process.env.INIT_ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error("INIT_ADMIN_PASSWORD is required before seeding the admin account.");
  }
  if (
    Buffer.byteLength(adminPassword, "utf8") > 72 ||
    adminPassword.length < 8 ||
    !/[a-z]/.test(adminPassword) ||
    !/[A-Z]/.test(adminPassword) ||
    !/\d/.test(adminPassword) ||
    !/[^A-Za-z0-9]/.test(adminPassword)
  ) {
    throw new Error("INIT_ADMIN_PASSWORD must be 8-72 bytes with uppercase, lowercase, number, and special characters.");
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "little_treasures_db",
    waitForConnections: true,
    connectionLimit: 10,
  });

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL,
      mobile VARCHAR(32) DEFAULT NULL,
      email_verified TINYINT(1) NOT NULL DEFAULT 1,
      account_status ENUM('active','suspended') NOT NULL DEFAULT 'active',
      session_version INT UNSIGNED NOT NULL DEFAULT 0,
      password_hash VARCHAR(255) NOT NULL,
      profile_image VARCHAR(255) DEFAULT NULL,
      role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query(schema);

  const [rows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [adminEmail]);

  if (rows && rows.length > 0) {
    console.log(`Admin account already exists for ${adminEmail}.`);
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await pool.execute(
    `INSERT INTO users (full_name, email, mobile, password_hash, profile_image, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'admin', NOW(), NOW())`,
    ["OMTreasure Admin", adminEmail, null, passwordHash, null],
  );

  console.log(`Admin seeded successfully for ${adminEmail}.`);
  await pool.end();
}

main().catch((error) => {
  console.error("Admin seed failed:", error.message);
  process.exit(1);
});
