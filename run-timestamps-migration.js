/**
 * Run Timer Timestamps Migration
 * Adds confirmed_at and out_for_delivery_at columns to orders table
 */

require('dotenv').config();
const pool = require('./db/db');

const migrationColumns = [
    { name: 'confirmed_at', definition: 'DATETIME NULL' },
    { name: 'out_for_delivery_at', definition: 'DATETIME NULL' }
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
    console.log('Starting timer timestamps migration...');
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
            c.Field === 'confirmed_at' || c.Field === 'out_for_delivery_at'
        );
        console.log('\nNew columns in orders table:');
        timerColumns.forEach(c => console.log(`  - ${c.Field}: ${c.Type}`));

    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
