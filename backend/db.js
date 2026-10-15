import mysql from 'mysql2/promise';

// MySQL Connection credentials
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Khushiofcourse#1',
  port: Number(process.env.DB_PORT) || 3306,
};

const DB_NAME = process.env.DB_NAME || 'quiz_game';

// 1. Ensure MySQL database 'quiz_game' exists
const tempConnection = await mysql.createConnection(dbConfig);
await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
await tempConnection.end();

// 2. Create connection pool for the quiz_game database
const db = mysql.createPool({
  ...dbConfig,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 3. Ensure users table exists in MySQL
await db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    player_name VARCHAR(255) DEFAULT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    xp INT DEFAULT 0,
    gold_medals INT DEFAULT 0,
    silver_medals INT DEFAULT 0,
    bronze_medals INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`);

// Add columns if table already existed without them
const newColumns = ['player_name', 'avatar_url', 'xp', 'gold_medals', 'silver_medals', 'bronze_medals', 'wins', 'losses'];
for (const col of newColumns) {
  try {
    let colType = 'INT DEFAULT 0';
    if (col === 'player_name' || col === 'avatar_url') colType = 'VARCHAR(255) DEFAULT NULL';
    await db.query(`ALTER TABLE users ADD COLUMN ${col} ${colType};`);
  } catch (e) { /* Column already exists */ }
}

// 4. Ensure custom_quizzes table exists in MySQL
await db.query(`
  CREATE TABLE IF NOT EXISTS custom_quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    host_id INT NULL,
    topic VARCHAR(255) NOT NULL,
    timer_seconds INT DEFAULT 20,
    questions_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`);

console.log(`✅ MySQL Database '${DB_NAME}' connected & initialized.`);

export default db;
