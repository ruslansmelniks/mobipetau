import { SupabaseClient, User } from "@supabase/supabase-js";

export async function getUserRole(supabase: SupabaseClient, user?: User | null): Promise<string | null> {
  if (!user) return null;
  // Only check metadata
  const metadataRole = user.user_metadata?.role || user.app_metadata?.role;
  if (metadataRole) return metadataRole;
  return null;
} 