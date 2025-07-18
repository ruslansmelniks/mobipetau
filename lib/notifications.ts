import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function createNotification({
  userId,
  type,
  message,
  referenceId
}: {
  userId: string;
  type: string;
  message: string;
  referenceId: string;
}) {
  // Validate type is provided
  if (!type) {
    console.error('Notification type is required');
    return;
  }
  
  console.log('Creating notification:', { userId, type, message });

  // Get user role to determine if notification should be sent
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (!user) {
    console.error('User not found:', userId);
    return;
  }

  // Define notification types for each role
  const vetNotificationTypes = [
    'new_appointment',
    'appointment_cancelled',
    'time_proposal_response',
    'appointment_withdrawn'
  ];

  const petOwnerNotificationTypes = [
    'appointment_accepted',
    'appointment_declined',
    'time_proposed',
    'appointment_completed',
    'invoice_ready'
  ];

  // Check if this notification type is relevant for the user's role
  const isRelevant = user.role === 'vet' 
    ? vetNotificationTypes.includes(type)
    : petOwnerNotificationTypes.includes(type);

  if (!isRelevant) {
    console.log(`Skipping ${type} notification for ${user.role} user ${userId}`);
    return;
  }

  // Create the notification
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      message,
      appointment_id: referenceId,
      read: false
    });

  if (error) {
    console.error('Error creating notification:', error);
  } else {
    console.log(`Created ${type} notification for ${user.role} user ${userId}`);
  }
} 