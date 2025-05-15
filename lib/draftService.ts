import { SupabaseClient } from '@supabase/supabase-js';

export async function getOrCreateDraft(supabase: SupabaseClient, userId: string) {
  // Step 1: Check for existing drafts
  const { data: existingDrafts, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('pet_owner_id', userId)
    .eq('status', 'pending')
    .order('updated_at', { ascending: false });
  
  if (fetchError) {
    console.error("Error checking for existing drafts:", fetchError);
    throw new Error('Failed to check existing drafts');
  }
  
  // Step 2: If we have multiple drafts, clean up the extras
  if (existingDrafts && existingDrafts.length > 1) {
    console.log(`Found ${existingDrafts.length} drafts, cleaning up extras`);
    
    // Keep only the most recent draft
    const mostRecentDraft = existingDrafts[0];
    const draftsToDelete = existingDrafts.slice(1);
    
    // Delete older drafts
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .in('id', draftsToDelete.map(d => d.id));
      
    if (deleteError) {
      console.error("Error cleaning up old drafts:", deleteError);
      // Continue with the most recent draft even if cleanup fails
    }
    
    return mostRecentDraft;
  }
  
  // Step 3: If we have exactly one draft, return it
  if (existingDrafts && existingDrafts.length === 1) {
    return existingDrafts[0];
  }
  
  // Step 4: If we have no drafts, create a new one
  const { data: newDraft, error: createError } = await supabase
    .from('appointments')
    .insert({
      pet_owner_id: userId,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
    
  if (createError) {
    console.error("Error creating new draft:", createError);
    throw new Error('Failed to create new draft appointment');
  }
  
  return newDraft;
}

export async function updateDraft(supabase: SupabaseClient, draftId: string, updates: any) {
  const { data: updatedDraft, error } = await supabase
    .from('appointments')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .select()
    .single();
    
  if (error) {
    console.error("Error updating draft:", error);
    throw new Error('Failed to update draft appointment');
  }
  
  return updatedDraft;
}

export async function deleteDraft(supabase: SupabaseClient, draftId: string) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', draftId);
    
  if (error) {
    console.error("Error deleting draft:", error);
    throw new Error('Failed to delete draft appointment');
  }
  
  return true;
} 