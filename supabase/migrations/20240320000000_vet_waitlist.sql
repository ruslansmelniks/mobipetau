-- Create vet_applications table
CREATE TABLE IF NOT EXISTS vet_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    license_number TEXT,
    years_experience INTEGER,
    specialties TEXT[],
    location TEXT,
    bio TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vet_applications_status ON vet_applications(status);
CREATE INDEX IF NOT EXISTS idx_vet_applications_email ON vet_applications(email);

-- Enable Row Level Security
ALTER TABLE vet_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anyone to insert new applications
CREATE POLICY "Allow public to insert vet applications"
    ON vet_applications
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Allow users to read their own applications
CREATE POLICY "Allow users to read their own applications"
    ON vet_applications
    FOR SELECT
    TO authenticated
    USING (email = auth.jwt()->>'email');

-- Allow admins to read all applications
CREATE POLICY "Allow admins to read all applications"
    ON vet_applications
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt()->>'role' = 'admin'
    );

-- Allow admins to update applications
CREATE POLICY "Allow admins to update applications"
    ON vet_applications
    FOR UPDATE
    TO authenticated
    USING (
        auth.jwt()->>'role' = 'admin'
    )
    WITH CHECK (
        auth.jwt()->>'role' = 'admin'
    );

-- Create function to handle application status updates
CREATE OR REPLACE FUNCTION handle_vet_application_status_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Set reviewed_at timestamp when status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.reviewed_at = NOW();
        NEW.reviewed_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status updates
CREATE TRIGGER on_vet_application_status_update
    BEFORE UPDATE ON vet_applications
    FOR EACH ROW
    EXECUTE FUNCTION handle_vet_application_status_update();

-- Add comment to table
COMMENT ON TABLE vet_applications IS 'Stores veterinarian waitlist applications and their status'; 