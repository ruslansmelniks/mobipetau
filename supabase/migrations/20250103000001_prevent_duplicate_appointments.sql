-- =====================================================
-- Prevent Duplicate Appointments Migration
-- =====================================================

-- Add unique constraint to prevent duplicate appointments
-- This ensures that a user cannot have multiple pending appointments
-- for the same pet, date, and time slot
ALTER TABLE public.appointments 
ADD CONSTRAINT unique_user_pet_datetime_pending 
UNIQUE (pet_owner_id, pet_id, date, time_slot, status)
WHERE status = 'pending';

-- Add index for better performance on the constraint
CREATE INDEX idx_appointments_user_pet_datetime_pending 
ON public.appointments (pet_owner_id, pet_id, date, time_slot, status) 
WHERE status = 'pending';

-- Add additional indexes for appointment queries
CREATE INDEX idx_appointments_pet_owner_status 
ON public.appointments (pet_owner_id, status);

CREATE INDEX idx_appointments_date_status 
ON public.appointments (date, status);

-- Add a function to safely create appointments with duplicate prevention
CREATE OR REPLACE FUNCTION create_appointment_if_not_exists(
  p_pet_owner_id UUID,
  p_pet_id UUID,
  p_date DATE,
  p_time_slot TEXT,
  p_services JSONB DEFAULT '[]'::jsonb,
  p_status TEXT DEFAULT 'pending',
  p_address TEXT DEFAULT NULL,
  p_additional_info TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_total_price DECIMAL DEFAULT 0,
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL,
  p_time_of_day TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  existing_appointment RECORD;
  new_appointment RECORD;
  result JSONB;
BEGIN
  -- Check for existing appointment
  SELECT * INTO existing_appointment
  FROM public.appointments
  WHERE pet_owner_id = p_pet_owner_id
    AND pet_id = p_pet_id
    AND date = p_date
    AND time_slot = p_time_slot
    AND status = p_status
  LIMIT 1;

  -- If appointment exists, return it
  IF existing_appointment IS NOT NULL THEN
    SELECT row_to_json(existing_appointment) INTO result;
    RETURN jsonb_build_object(
      'success', true,
      'appointment', result,
      'message', 'Existing appointment found',
      'is_existing', true
    );
  END IF;

  -- Create new appointment
  INSERT INTO public.appointments (
    pet_owner_id,
    pet_id,
    date,
    time_slot,
    services,
    status,
    address,
    additional_info,
    notes,
    total_price,
    latitude,
    longitude,
    time_of_day,
    created_at,
    updated_at
  ) VALUES (
    p_pet_owner_id,
    p_pet_id,
    p_date,
    p_time_slot,
    p_services,
    p_status,
    p_address,
    p_additional_info,
    p_notes,
    p_total_price,
    p_latitude,
    p_longitude,
    p_time_of_day,
    NOW(),
    NOW()
  ) RETURNING * INTO new_appointment;

  SELECT row_to_json(new_appointment) INTO result;
  RETURN jsonb_build_object(
    'success', true,
    'appointment', result,
    'message', 'New appointment created',
    'is_existing', false
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition where another process created the appointment
    SELECT * INTO existing_appointment
    FROM public.appointments
    WHERE pet_owner_id = p_pet_owner_id
      AND pet_id = p_pet_id
      AND date = p_date
      AND time_slot = p_time_slot
      AND status = p_status
    LIMIT 1;

    SELECT row_to_json(existing_appointment) INTO result;
    RETURN jsonb_build_object(
      'success', true,
      'appointment', result,
      'message', 'Appointment created by another process',
      'is_existing', true
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create appointment'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_appointment_if_not_exists(UUID, UUID, DATE, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT) TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION create_appointment_if_not_exists IS 'Safely creates an appointment, preventing duplicates. Returns existing appointment if one already exists with same user, pet, date, time slot, and status.'; 