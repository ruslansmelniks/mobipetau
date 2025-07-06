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
        BEGIN
            RETURN QUERY
            SELECT 
                n.id,
                n.type,
                COALESCE(
                    CASE 
                        WHEN n.type = 'appointment' THEN 
                            'New appointment request'
                        ELSE 
                            'New notification'
                    END, 
                    'Notification'
                ) as message,
                n.created_at,
                COALESCE(n.seen, false) as seen,
                n.appointment_id,
                CASE 
                    WHEN n.appointment_id IS NOT NULL THEN 
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
                        WHERE a.id = n.appointment_id)
                    ELSE NULL
                END as appointment_details
            FROM 
                notifications n
            WHERE 
                n.user_id = user_id_param
            ORDER BY 
                n.created_at DESC
            LIMIT 50;
        END;
        $$ LANGUAGE plpgsql;
        $$;
    END IF;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fetchnotificationswithdetails(UUID) TO authenticated; 