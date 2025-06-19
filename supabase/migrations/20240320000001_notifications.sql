-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT,
  reference_id UUID,
  reference_type TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to notify vets of new appointments
CREATE OR REPLACE FUNCTION notify_vets_of_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  vet_id UUID;
  pet_name TEXT;
  owner_name TEXT;
BEGIN
  -- Get pet name
  SELECT name INTO pet_name
  FROM pets
  WHERE id = NEW.pet_id;

  -- Get owner name
  SELECT first_name || ' ' || last_name INTO owner_name
  FROM users
  WHERE id = NEW.pet_owner_id;

  -- Notify all vets
  FOR vet_id IN 
    SELECT id FROM users WHERE role = 'vet'
  LOOP
    INSERT INTO notifications (
      user_id,
      message,
      type,
      reference_id,
      reference_type
    ) VALUES (
      vet_id,
      format('New appointment request from %s for %s on %s at %s', 
        owner_name, 
        pet_name, 
        NEW.date, 
        NEW.time_slot
      ),
      'new_appointment',
      NEW.id,
      'appointment'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new appointments
DROP TRIGGER IF EXISTS notify_vets_on_new_appointment ON appointments;
CREATE TRIGGER notify_vets_on_new_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_vets_of_new_appointment(); 