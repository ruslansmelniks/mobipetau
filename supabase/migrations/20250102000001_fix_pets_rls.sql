-- Fix pets table RLS policies
-- Migration: 20250102000001_fix_pets_rls.sql

-- Ensure RLS is enabled
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Pet owners can read own pets" ON pets;
DROP POLICY IF EXISTS "Pet owners can insert own pets" ON pets;
DROP POLICY IF EXISTS "Pet owners can update own pets" ON pets;
DROP POLICY IF EXISTS "Pet owners can delete own pets" ON pets;

-- Create comprehensive RLS policies for pets table
-- Allow pet owners to read their own pets
CREATE POLICY "Pet owners can read own pets" ON pets
FOR SELECT USING (auth.uid() = owner_id);

-- Allow pet owners to insert their own pets
CREATE POLICY "Pet owners can insert own pets" ON pets
FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Allow pet owners to update their own pets
CREATE POLICY "Pet owners can update own pets" ON pets
FOR UPDATE USING (auth.uid() = owner_id);

-- Allow pet owners to delete their own pets
CREATE POLICY "Pet owners can delete own pets" ON pets
FOR DELETE USING (auth.uid() = owner_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON pets TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON pets(created_at DESC); 