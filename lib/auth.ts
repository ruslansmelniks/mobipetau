import { SupabaseClient, User } from "@supabase/supabase-js";

export async function getUserRole(supabase: SupabaseClient, user?: User | null): Promise<string | null> {
  if (!user) return null;
  
  // First check metadata
  const metadataRole = user.user_metadata?.role;
  if (metadataRole) return metadataRole;
  
  // Then check database
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
    
    return data?.role || null;
  } catch (e) {
    console.error("Exception fetching user role:", e);
    return null;
  }
} 