/**
 * Run Timer Migration
 * Adds timer columns to the orders table
 */

require('dotenv').config();
const pool = require('./db/db');

const migrationColumns = [
    { name: 'timer_started_at', definition: 'DATETIME NULL' },
    { name: 'timer_preparation_minutes', definition: 'INT DEFAULT 0' },
    { name: 'timer_delivery_minutes', definition: 'INT DEFAULT 0' },
    { name: 'timer_phase', definition: "VARCHAR(20) DEFAULT 'pending'" },
    { name: 'timer_stuck_at_minutes', definition: 'INT NULL' },
    { name: 'delivery_distance_km', definition: 'DECIMAL(10,2) NULL' }
];

async function columnExists(columnName) {
    try {
        const [columns] = await pool.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = ?`,
            [process.env.DB_NAME.trim(), columnName]
        );
        return columns.length > 0;
    } catch (err) {
        console.error('Error checking column:', err.message);
        return false;
    }
}

async function runMigration() {
    console.log('Starting timer migration...');
    console.log('Database:', process.env.DB_HOST, process.env.DB_NAME);

    try {
        for (const col of migrationColumns) {
            const exists = await columnExists(col.name);

            if (exists) {
                console.log(`✓ Column ${col.name} already exists, skipping`);
            } else {
                const query = `ALTER TABLE orders ADD COLUMN ${col.name} ${col.definition}`;
                console.log('Adding column:', col.name);
                await pool.execute(query);
                console.log(`✓ Added ${col.name}`);
            }
        }

        console.log('\n✅ Migration completed successfully!');

        // Verify columns exist
        const [columns] = await pool.execute('DESCRIBE orders');
        const timerColumns = columns.filter(c =>
            c.Field.startsWith('timer_') || c.Field === 'delivery_distance_km'
        );
        console.log('\nTimer columns in orders table:');
        timerColumns.forEach(c => console.log(`  - ${c.Field}: ${c.Type}`));

    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
