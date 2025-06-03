// Remove global supabase client
// import { createClient } from '@supabase/supabase-js';

// Clean up old drafts
async function cleanupOldDrafts(supabase: any, userId: string) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    console.log('Cleaning up old drafts for user:', userId);
    
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('pet_owner_id', userId)
      .eq('status', 'pending')
      .lt('created_at', oneDayAgo);

    if (error) {
      console.error('Error cleaning up old drafts:', error);
    }
  } catch (err) {
    console.error('Failed to clean up old drafts:', err);
  }
}

// Get or create a draft appointment
export async function getOrCreateDraft(supabase: any, userId: string) {
  try {
    console.log('Getting or creating draft for user:', userId);

    // First, try to find an existing draft
    const { data: existingDrafts, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('pet_owner_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching existing drafts:', fetchError);
      throw fetchError;
    }

    // If we found an existing draft, return it
    if (existingDrafts && existingDrafts.length > 0) {
      console.log('Found existing draft:', existingDrafts[0].id);
      return existingDrafts[0];
    }

    // Clean up any old drafts before creating a new one
    await cleanupOldDrafts(supabase, userId);

    // Create a new draft
    const { data: newDraft, error: createError } = await supabase
      .from('appointments')
      .insert([
        {
          pet_owner_id: userId,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('Error creating new draft:', createError);
      throw createError;
    }

    console.log('Created new draft:', newDraft.id);
    return newDraft;
  } catch (err) {
    console.error('Failed to get or create draft:', err);
    throw err;
  }
}

// Update a draft appointment
export async function updateDraft(supabase: any, draftId: string, updates: any) {
  try {
    console.log('Updating draft:', { draftId, updates });

    const { data, error } = await supabase
      .from('appointments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId)
      .select()
      .single();

    if (error) {
      console.error('Error updating draft:', error);
      throw error;
    }

    console.log('Draft updated successfully:', data.id);
    return data;
  } catch (err) {
    console.error('Failed to update draft:', err);
    throw err;
  }
}

// Delete a draft appointment
export async function deleteDraft(supabase: any, draftId: string) {
  try {
    console.log('Deleting draft:', draftId);

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', draftId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error deleting draft:', error);
      throw error;
    }

    console.log('Draft deleted successfully');
  } catch (err) {
    console.error('Failed to delete draft:', err);
    throw err;
  }
} 