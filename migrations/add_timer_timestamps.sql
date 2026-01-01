-- Add column to store the timestamp when order is marked "Out for Delivery"
-- This timestamp is used as the base for delivery timer calculation

ALTER TABLE orders ADD COLUMN IF NOT EXISTS out_for_delivery_at DATETIME NULL;

-- Also add confirmed_at if not already present (for prep time calculation)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at DATETIME NULL;
