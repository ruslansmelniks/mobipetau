-- Clean up orphaned notifications
-- Delete notifications without appointment records
DELETE FROM notifications 
WHERE reference_id IS NULL OR reference_id NOT IN (
  SELECT id FROM appointments
);

-- Verify deletion
SELECT COUNT(*) as orphaned_notifications
FROM notifications 
WHERE reference_id IS NULL OR reference_id NOT IN (
  SELECT id FROM appointments
);

-- Show remaining notifications with their appointment status
SELECT 
  n.id as notification_id,
  n.type,
  n.message,
  n.reference_id,
  CASE 
    WHEN a.id IS NOT NULL THEN 'Valid appointment'
    ELSE 'Orphaned notification'
  END as status
FROM notifications n
LEFT JOIN appointments a ON n.reference_id = a.id
ORDER BY n.created_at DESC
LIMIT 10; 