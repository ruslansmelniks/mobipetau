const { createClient } = require('@supabase/supabase-js');

// Replace with your actual service role key (keep this secret!)
const SUPABASE_URL = 'https://vhpcosbihfooclhoemoz.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocGNvc2JpaGZvb2NsaG9lbW96Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjU0MjgwMSwiZXhwIjoyMDYyMTE4ODAxfQ.DDgXfchxw5wrsZ-_UcV9i4osOX23b4Tjr9uHQz1RWYw'; // <-- Replace this!
const USER_ID = '235ecf01-b04d-4919-a98f-4de4dded267c'; // <-- Replace this!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function promoteToAdmin() {
  const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
    app_metadata: { role: 'admin' }
  });

  if (error) {
    console.error('Failed to promote user to admin:', error);
  } else {
    console.log('User promoted to admin:', data);
  }
}

promoteToAdmin(); 