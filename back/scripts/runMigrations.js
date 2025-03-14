const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'sahin',
  password: 'root',
  database: 'tour_program',
  multipleStatements: true // Birden fazla SQL statement çalıştırabilmek için
});

const migrationPath = path.join(__dirname, '../migrations/create_provider_settings_table.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }

  db.query(migrationSQL, (error, results) => {
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    console.log('Migration successful!');
    db.end();
  });
}); 