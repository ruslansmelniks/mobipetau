-- Create vet_job_views table
CREATE TABLE IF NOT EXISTS vet_job_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vet_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vet_id, appointment_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vet_job_views_vet_id ON vet_job_views(vet_id);
CREATE INDEX IF NOT EXISTS idx_vet_job_views_appointment_id ON vet_job_views(appointment_id);

-- Create function to get new jobs count for a vet
CREATE OR REPLACE FUNCTION get_new_jobs_count_for_vet(vet_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT a.id)
  INTO new_count
  FROM appointments a
  LEFT JOIN vet_job_views vjv ON vjv.appointment_id = a.id AND vjv.vet_id = vet_user_id
  WHERE a.status = 'waiting_for_vet'
    AND a.payment_status = 'paid'
    AND a.vet_id IS NULL  -- Not accepted by any vet yet
    AND vjv.id IS NULL;    -- Not viewed by this vet
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql; 