/**
 * Check Orders Timer Data
 */
require('dotenv').config();
const pool = require('./db/db');

async function checkOrders() {
    try {
        const [orders] = await pool.execute(`
      SELECT 
        order_id, 
        status, 
        confirmed_at,
        out_for_delivery_at,
        timer_started_at, 
        timer_preparation_minutes, 
        timer_delivery_minutes,
        timer_phase, 
        delivery_time,
        created_at
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

        console.log('\n=== Recent Orders with Timer Data ===\n');

        for (const order of orders) {
            console.log(`Order: ${order.order_id}`);
            console.log(`  Status: ${order.status}`);
            console.log(`  Confirmed At: ${order.confirmed_at}`);
            console.log(`  Out for Delivery At: ${order.out_for_delivery_at}`);
            console.log(`  Timer Started At: ${order.timer_started_at}`);
            console.log(`  Prep Time (mins): ${order.timer_preparation_minutes}`);
            console.log(`  Delivery Time (mins): ${order.timer_delivery_minutes}`);
            console.log(`  Timer Phase: ${order.timer_phase}`);
            console.log(`  Delivery Time (string): ${order.delivery_time}`);
            console.log(`  Created At: ${order.created_at}`);
            console.log('---');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkOrders();
