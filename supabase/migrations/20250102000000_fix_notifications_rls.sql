-- Fix notifications RLS policies
-- Migration: 20250102000000_fix_notifications_rls.sql

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Create comprehensive RLS policies
-- Allow users to view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow users to update their own notifications (for marking as read)
CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow the system to insert notifications (using service role or authenticated users)
CREATE POLICY "System can insert notifications" 
ON notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications" 
ON notifications FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Ensure the read column exists and has proper default
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;

-- Update any existing notifications to have read = false if they don't have the column set
UPDATE notifications 
SET read = FALSE 
WHERE read IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated; 