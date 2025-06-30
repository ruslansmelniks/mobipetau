-- Fix notifications table schema
-- This script ensures the 'read' column exists and adds proper indexes

-- Add the 'read' column if it doesn't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;

-- Create an index for better query performance on user_id and read
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, read);

-- Create an index for read status queries
CREATE INDEX IF NOT EXISTS idx_notifications_read 
ON notifications(read);

-- Update any existing notifications to have read = false if they don't have the column set
UPDATE notifications 
SET read = FALSE 
WHERE read IS NULL;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position; 