-- Create the fetchnotificationswithdetails function if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'fetchnotificationswithdetails'
    ) THEN
        EXECUTE $$
        CREATE OR REPLACE FUNCTION fetchnotificationswithdetails(user_id_param UUID)
        RETURNS TABLE (
            id UUID,
            type TEXT,
            message TEXT,
            created_at TIMESTAMPTZ,
            seen BOOLEAN,
            appointment_id UUID,
            appointment_details JSONB
        ) 
        SECURITY DEFINER
        AS $$
        DECLARE
            user_role TEXT;
        BEGIN
            -- Get user role
            SELECT role INTO user_role
            FROM users
            WHERE id = user_id_param;
            
            -- Define notification types for each role
            IF user_role = 'vet' THEN
                -- Vets only see job-related notifications
                RETURN QUERY
                SELECT 
                    n.id,
                    n.type,
                    COALESCE(
                        CASE 
                            WHEN n.type = 'new_appointment' THEN 
                                'New appointment request'
                            WHEN n.type = 'appointment_cancelled' THEN 
                                'Appointment cancelled'
                            WHEN n.type = 'time_proposal_response' THEN 
                                'Time proposal response'
                            WHEN n.type = 'appointment_withdrawn' THEN 
                                'Appointment withdrawn'
                            ELSE 
                                'New notification'
                        END, 
                        'Notification'
                    ) as message,
                    n.created_at,
                    COALESCE(n.read, false) as seen,
                    n.reference_id as appointment_id,
                    CASE 
                        WHEN n.reference_id IS NOT NULL THEN 
                            (SELECT jsonb_build_object(
                                'id', a.id,
                                'date', a.date,
                                'time_slot', a.time_slot,
                                'status', a.status,
                                'pet_owner_name', u.first_name || ' ' || u.last_name,
                                'pet_name', p.name
                            )
                            FROM appointments a
                            LEFT JOIN users u ON a.pet_owner_id = u.id
                            LEFT JOIN pets p ON a.pet_id = p.id
                            WHERE a.id = n.reference_id)
                        ELSE NULL
                    END as appointment_details
                FROM 
                    notifications n
                WHERE 
                    n.user_id = user_id_param
                    AND n.type IN ('new_appointment', 'appointment_cancelled', 'time_proposal_response', 'appointment_withdrawn')
                ORDER BY 
                    n.created_at DESC
                LIMIT 50;
            ELSE
                -- Pet owners only see appointment-related notifications
                RETURN QUERY
                SELECT 
                    n.id,
                    n.type,
                    COALESCE(
                        CASE 
                            WHEN n.type = 'appointment_accepted' THEN 
                                'Appointment accepted'
                            WHEN n.type = 'appointment_declined' THEN 
                                'Appointment declined'
                            WHEN n.type = 'time_proposed' THEN 
                                'New time proposed'
                            WHEN n.type = 'appointment_completed' THEN 
                                'Appointment completed'
                            WHEN n.type = 'invoice_ready' THEN 
                                'Invoice ready'
                            ELSE 
                                'New notification'
                        END, 
                        'Notification'
                    ) as message,
                    n.created_at,
                    COALESCE(n.read, false) as seen,
                    n.reference_id as appointment_id,
                    CASE 
                        WHEN n.reference_id IS NOT NULL THEN 
                            (SELECT jsonb_build_object(
                                'id', a.id,
                                'date', a.date,
                                'time_slot', a.time_slot,
                                'status', a.status,
                                'pet_owner_name', u.first_name || ' ' || u.last_name,
                                'pet_name', p.name
                            )
                            FROM appointments a
                            LEFT JOIN users u ON a.pet_owner_id = u.id
                            LEFT JOIN pets p ON a.pet_id = p.id
                            WHERE a.id = n.reference_id)
                        ELSE NULL
                    END as appointment_details
                FROM 
                    notifications n
                WHERE 
                    n.user_id = user_id_param
                    AND n.type IN ('appointment_accepted', 'appointment_declined', 'time_proposed', 'appointment_completed', 'invoice_ready')
                ORDER BY 
                    n.created_at DESC
                LIMIT 50;
            END IF;
        END;
        $$ LANGUAGE plpgsql;
        $$;
    END IF;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fetchnotificationswithdetails(UUID) TO authenticated; 