export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string
          created_at: string
          date: string | null
          time: string | null
          address: string | null
          status: string
          notes: string | null
          pet_owner_id: string
          vet_id: string | null
          payment_status: string | null
          payment_id: string | null
          payment_amount: number | null
          payment_method: string | null
          pet_id: string
          services: Json
          total_price: number
          time_slot: string
          latitude: number
          longitude: number
          additional_info: string
          time_of_day: string
          is_in_perth: boolean
          updated_at: string
          accepted_at: string | null
          proposed_time: string | null
          proposed_message: string | null
          proposed_at: string | null
          completed_at: string | null
          completion_notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          date?: string | null
          time?: string | null
          address?: string | null
          status?: string
          notes?: string | null
          pet_owner_id: string
          vet_id?: string | null
          payment_status?: string | null
          payment_id?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          pet_id: string
          services?: Json
          total_price?: number
          time_slot?: string
          latitude?: number
          longitude?: number
          additional_info?: string
          time_of_day?: string
          is_in_perth?: boolean
          updated_at?: string
          accepted_at?: string | null
          proposed_time?: string | null
          proposed_message?: string | null
          proposed_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          date?: string | null
          time?: string | null
          address?: string | null
          status?: string
          notes?: string | null
          pet_owner_id?: string
          vet_id?: string | null
          payment_status?: string | null
          payment_id?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          pet_id?: string
          services?: Json
          total_price?: number
          time_slot?: string
          latitude?: number
          longitude?: number
          additional_info?: string
          time_of_day?: string
          is_in_perth?: boolean
          updated_at?: string
          accepted_at?: string | null
          proposed_time?: string | null
          proposed_message?: string | null
          proposed_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
        }
      }
      pets: {
        Row: {
          id: string
          created_at: string
          name: string
          type: string
          breed: string | null
          age: number | null
          weight: number | null
          owner_id: string
          image: string | null
          medical_history: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          type: string
          breed?: string | null
          age?: number | null
          weight?: number | null
          owner_id: string
          image?: string | null
          medical_history?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          type?: string
          breed?: string | null
          age?: number | null
          weight?: number | null
          owner_id?: string
          image?: string | null
          medical_history?: Json | null
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          name: string | null
          role: string
          email: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          additional_info: string | null
        }
        Insert: {
          id: string
          created_at?: string
          name?: string | null
          role?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          additional_info?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string | null
          role?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          additional_info?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

