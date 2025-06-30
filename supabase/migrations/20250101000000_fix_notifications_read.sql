-- Fix notifications table schema - ensure read column exists
-- Migration: 20250101000000_fix_notifications_read.sql

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

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id); 