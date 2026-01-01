-- Timer Backend Migration
-- Run this script to add timer tracking columns to the orders table

-- Add timer tracking columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS timer_started_at DATETIME NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS timer_preparation_minutes INT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS timer_delivery_minutes INT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS timer_phase VARCHAR(20) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS timer_stuck_at_minutes INT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_km DECIMAL(10,2) NULL;

-- Add index for faster timer queries
CREATE INDEX IF NOT EXISTS idx_orders_timer_phase ON orders(timer_phase);
CREATE INDEX IF NOT EXISTS idx_orders_timer_started ON orders(timer_started_at);
