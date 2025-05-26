import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type AppointmentWithRelations = Appointment & {
  pets: Database['public']['Tables']['pets']['Row'];
  pet_owner: Database['public']['Tables']['users']['Row'];
};

export class AppointmentService {
  constructor(private supabase: SupabaseClient) {}

  async getAppointment(id: string): Promise<AppointmentWithRelations | null> {
    const { data, error } = await this.supabase
      .from('appointments')
      .select(`
        *,
        pets:pet_id (*),
        pet_owner:pet_owner_id (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getAppointmentsByUser(userId: string): Promise<AppointmentWithRelations[]> {
    const { data, error } = await this.supabase
      .from('appointments')
      .select(`
        *,
        pets:pet_id (*),
        pet_owner:pet_owner_id (*)
      `)
      .eq('pet_owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getOrCreateDraft(userId: string): Promise<Appointment> {
    // Check for existing drafts
    const { data: existingDrafts, error: fetchError } = await this.supabase
      .from('appointments')
      .select('*')
      .eq('pet_owner_id', userId)
      .eq('status', 'pending')
      .order('updated_at', { ascending: false });

    if (fetchError) throw fetchError;

    // Clean up multiple drafts if they exist
    if (existingDrafts && existingDrafts.length > 1) {
      const mostRecentDraft = existingDrafts[0];
      const draftsToDelete = existingDrafts.slice(1);

      const { error: deleteError } = await this.supabase
        .from('appointments')
        .delete()
        .in('id', draftsToDelete.map(d => d.id));

      if (deleteError) console.error('Error cleaning up old drafts:', deleteError);
      return mostRecentDraft;
    }

    // Return existing draft if one exists
    if (existingDrafts && existingDrafts.length === 1) {
      return existingDrafts[0];
    }

    // Create new draft
    const { data: newDraft, error: createError } = await this.supabase
      .from('appointments')
      .insert({
        pet_owner_id: userId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) throw createError;
    return newDraft;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await this.supabase
      .from('appointments')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateAppointmentStatus(
    id: string,
    status: string,
    options?: {
      proposedDate?: string;
      proposedTime?: string;
      message?: string;
    }
  ): Promise<Appointment> {
    const updateData: Partial<Appointment> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (options?.proposedDate) updateData.proposed_date = options.proposedDate;
    if (options?.proposedTime) updateData.proposed_time = options.proposedTime;
    if (options?.message) updateData.proposed_message = options.message;

    const { data, error } = await this.supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteAppointment(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
} 