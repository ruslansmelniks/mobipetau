import { User as SupabaseUser } from '@supabase/supabase-js';

// Interface for the user profile data typically stored in user_metadata or a separate table
export interface UserProfile {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  additional_info?: string;
  role?: 'pet_owner' | 'vet' | 'admin'; // Example roles
  // Add any other profile fields your application uses
}

// Interface combining Supabase user data with our profile data
// We might not need all fields from SupabaseUser, so pick what's relevant
export interface UserData extends Partial<SupabaseUser> {
  user_metadata: UserProfile;
  // You can add email, id directly if you access them frequently outside of user_metadata
  // email?: string; 
  // id?: string;
}

// Type for the form data in the profile page
export interface ProfileFormData extends UserProfile {
  email?: string; // Email is part of auth but often edited with profile
}

// New types for Bookings page
export interface PetSummary {
  id: string;
  name?: string;
  image?: string;
  type?: string; // Or species, adjust as needed
}

export interface Appointment {
  id: string;
  created_at: string;
  pet_owner_id: string;
  pet_id: string;
  pets: PetSummary | null; // Joined pet data
  vet_id?: string | null;
  // vets: VetSummary | null; // If you join vet data
  services?: string[] | string; // JSON array of service IDs, or stringified JSON
  date?: string | null;
  time_slot?: string | null;
  reason?: string | null;
  symptoms?: string[] | string | null; // JSON array of symptoms or stringified JSON
  additional_info_pet?: string | null;
  notes?: string | null; // Added notes field
  address?: string | null; // If different from user's default
  status: 'pending' | 'confirmed' | 'pending_vet' | 'rescheduled' | 'completed' | 'cancelled';
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_id?: string | null;
  payment_method?: string | null;
  total_price?: number | null;
  proposed_time?: string | null;
  // Add any other appointment fields
} 