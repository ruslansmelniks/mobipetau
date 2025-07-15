-- =====================================================
-- MobiPet Complete Database Schema Migration
-- =====================================================

-- Drop existing tables if they exist (with CASCADE)
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.vet_services CASCADE;
DROP TABLE IF EXISTS public.vet_availability CASCADE;
DROP TABLE IF EXISTS public.vet_specializations CASCADE;
DROP TABLE IF EXISTS public.pet_breeds CASCADE;
DROP TABLE IF EXISTS public.pet_types CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.declined_jobs CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.appointments_backup CASCADE;
DROP TABLE IF EXISTS public.pets CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing types/enums
DROP TYPE IF EXISTS public.appointment_status CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.pet_gender CASCADE;
DROP TYPE IF EXISTS public.pet_age_unit CASCADE;
DROP TYPE IF EXISTS public.notification_type CASCADE;
DROP TYPE IF EXISTS public.payment_method_type CASCADE;

-- =====================================================
-- CREATE ENUMS/TYPES
-- =====================================================

-- Appointment status enum
CREATE TYPE public.appointment_status AS ENUM (
    'requested',
    'confirmed', 
    'rejected',
    'proposed_time',
    'completed',
    'cancelled',
    'pending',
    'waiting_for_vet'
);

-- Payment status enum
CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded',
    'cancelled'
);

-- User role enum
CREATE TYPE public.user_role AS ENUM (
    'pet_owner',
    'vet',
    'admin',
    'support'
);

-- Pet gender enum
CREATE TYPE public.pet_gender AS ENUM (
    'male',
    'female',
    'unknown'
);

-- Pet age unit enum
CREATE TYPE public.pet_age_unit AS ENUM (
    'days',
    'weeks',
    'months',
    'years'
);

-- Notification type enum
CREATE TYPE public.notification_type AS ENUM (
    'appointment_confirmed',
    'appointment_cancelled',
    'appointment_reminder',
    'payment_received',
    'payment_failed',
    'new_message',
    'vet_proposal',
    'system_alert'
);

-- Payment method type enum
CREATE TYPE public.payment_method_type AS ENUM (
    'credit_card',
    'debit_card',
    'bank_transfer',
    'paypal',
    'stripe'
);

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- User Management Tables
-- =====================

-- Main users table (extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    role public.user_role DEFAULT 'pet_owner',
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Australia',
    emergency_contact TEXT,
    emergency_phone TEXT,
    additional_info TEXT,
    profile_image TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User profiles (additional user information)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    bio TEXT,
    qualifications TEXT,
    experience_years INTEGER,
    specializations TEXT[],
    license_number TEXT,
    insurance_info TEXT,
    business_hours JSONB,
    service_areas TEXT[],
    languages TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pet Management Tables
-- ====================

-- Pet types table
CREATE TABLE public.pet_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pet breeds table
CREATE TABLE public.pet_breeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_type_id UUID REFERENCES public.pet_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    average_lifespan INTEGER,
    average_weight DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(pet_type_id, name)
);

-- Pets table
CREATE TABLE public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type_id UUID REFERENCES public.pet_types(id),
    breed_id UUID REFERENCES public.pet_breeds(id),
    species TEXT,
    gender public.pet_gender,
    age INTEGER,
    age_unit public.pet_age_unit,
    weight DECIMAL,
    weight_unit TEXT DEFAULT 'kg',
    color TEXT,
    microchip_number TEXT,
    medical_history TEXT,
    allergies TEXT[],
    medications TEXT[],
    image TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vet Management Tables
-- ====================

-- Vet specializations table
CREATE TABLE public.vet_specializations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vet services table
CREATE TABLE public.vet_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vet_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    specialization_id UUID REFERENCES public.vet_specializations(id),
    service_name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 60,
    base_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vet availability table
CREATE TABLE public.vet_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vet_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(vet_id, day_of_week)
);

-- Booking System Tables
-- =====================

-- Appointments table
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    vet_id UUID REFERENCES public.users(id),
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME,
    time_slot TEXT,
    time_of_day TEXT,
    duration_minutes INTEGER DEFAULT 60,
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_in_perth BOOLEAN DEFAULT true,
    status public.appointment_status DEFAULT 'pending',
    payment_status public.payment_status DEFAULT 'pending',
    services JSONB DEFAULT '[]'::jsonb,
    total_price DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    additional_info TEXT,
    payment_id TEXT,
    payment_method TEXT,
    payment_amount DECIMAL(10,2),
    proposed_time TEXT,
    proposed_message TEXT,
    proposed_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Reviews & Ratings Table
-- =======================

-- Reviews table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    vet_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(appointment_id, reviewer_id)
);

-- Payment Methods Table
-- ====================

-- Payment methods table
CREATE TABLE public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type public.payment_method_type NOT NULL,
    provider TEXT NOT NULL,
    account_number TEXT,
    expiry_date DATE,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Communication Tables
-- ===================

-- Conversations table
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participants UUID[] NOT NULL,
    title TEXT,
    is_group BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vet Job Management Tables
-- =========================

-- Declined jobs table
CREATE TABLE public.declined_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vet_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    reason TEXT,
    declined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(vet_id, appointment_id)
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_users_is_active ON public.users(is_active);

-- Pets indexes
CREATE INDEX idx_pets_owner_id ON public.pets(owner_id);
CREATE INDEX idx_pets_type_id ON public.pets(type_id);
CREATE INDEX idx_pets_breed_id ON public.pets(breed_id);
CREATE INDEX idx_pets_is_active ON public.pets(is_active);

-- Appointments indexes
CREATE INDEX idx_appointments_pet_owner_id ON public.appointments(pet_owner_id);
CREATE INDEX idx_appointments_vet_id ON public.appointments(vet_id);
CREATE INDEX idx_appointments_pet_id ON public.appointments(pet_id);
CREATE INDEX idx_appointments_date ON public.appointments(date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_payment_status ON public.appointments(payment_status);
CREATE INDEX idx_appointments_date_status ON public.appointments(date, status);
CREATE INDEX idx_appointments_vet_date ON public.appointments(vet_id, date);

-- Reviews indexes
CREATE INDEX idx_reviews_appointment_id ON public.reviews(appointment_id);
CREATE INDEX idx_reviews_vet_id ON public.reviews(vet_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);

-- Vet services indexes
CREATE INDEX idx_vet_services_vet_id ON public.vet_services(vet_id);
CREATE INDEX idx_vet_services_specialization_id ON public.vet_services(specialization_id);
CREATE INDEX idx_vet_services_is_active ON public.vet_services(is_active);

-- Vet availability indexes
CREATE INDEX idx_vet_availability_vet_id ON public.vet_availability(vet_id);
CREATE INDEX idx_vet_availability_day_time ON public.vet_availability(day_of_week, start_time, end_time);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Messages indexes
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Payment methods indexes
CREATE INDEX idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX idx_payment_methods_is_default ON public.payment_methods(is_default);

-- Pet breeds indexes
CREATE INDEX idx_pet_breeds_pet_type_id ON public.pet_breeds(pet_type_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declined_jobs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (
        auth_user_id,
        id,
        email,
        first_name,
        last_name,
        phone,
        role,
        created_at
    ) VALUES (
        NEW.id,
        gen_random_uuid(),
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'role', 'pet_owner'),
        NEW.created_at
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'User with ID % already exists in the users table', NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old draft appointments
CREATE OR REPLACE FUNCTION public.cleanup_draft_appointments()
RETURNS void AS $$
BEGIN
    DELETE FROM appointments 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate average rating for a vet
CREATE OR REPLACE FUNCTION public.get_vet_average_rating(vet_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    avg_rating DECIMAL;
BEGIN
    SELECT COALESCE(AVG(rating), 0) INTO avg_rating
    FROM public.reviews
    WHERE vet_id = vet_uuid AND is_verified = true;
    
    RETURN avg_rating;
END;
$$ LANGUAGE plpgsql;

-- Function to get vet review count
CREATE OR REPLACE FUNCTION public.get_vet_review_count(vet_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    review_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO review_count
    FROM public.reviews
    WHERE vet_id = vet_uuid AND is_verified = true;
    
    RETURN review_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Trigger to update updated_at column
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.pets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.vet_services
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.vet_availability
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to handle new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default pet types
INSERT INTO public.pet_types (name, description, icon) VALUES
('Dog', 'Canine pets including all dog breeds', '🐕'),
('Cat', 'Feline pets including all cat breeds', '🐱'),
('Bird', 'Avian pets including parrots, canaries, etc.', '🐦'),
('Fish', 'Aquatic pets including tropical and cold water fish', '🐠'),
('Rabbit', 'Lagomorph pets including all rabbit breeds', '🐰'),
('Hamster', 'Small rodent pets', '🐹'),
('Guinea Pig', 'Cavy pets', '🐹'),
('Horse', 'Equine pets', '🐎'),
('Reptile', 'Reptilian pets including snakes, lizards, turtles', '🦎'),
('Other', 'Other types of pets', '🐾');

-- Insert default vet specializations
INSERT INTO public.vet_specializations (name, description, icon) VALUES
('General Practice', 'General veterinary care and wellness', '🏥'),
('Surgery', 'Surgical procedures and operations', '🔪'),
('Dermatology', 'Skin conditions and allergies', '🦠'),
('Dentistry', 'Dental care and oral health', '🦷'),
('Cardiology', 'Heart and cardiovascular health', '❤️'),
('Oncology', 'Cancer treatment and care', '🩺'),
('Emergency Medicine', 'Emergency and critical care', '🚨'),
('Behavioral Medicine', 'Animal behavior and training', '🧠'),
('Nutrition', 'Diet and nutritional counseling', '🥗'),
('Alternative Medicine', 'Holistic and alternative treatments', '🌿');

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to anon users (for public data)
GRANT SELECT ON public.pet_types TO anon;
GRANT SELECT ON public.pet_breeds TO anon;
GRANT SELECT ON public.vet_specializations TO anon;
GRANT SELECT ON public.vet_services TO anon;

-- Grant permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- CREATE BASIC RLS POLICIES
-- =====================================================

-- Users table policies
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    );

-- Pets table policies
CREATE POLICY "Pet owners can view their own pets" ON public.pets
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Pet owners can insert their own pets" ON public.pets
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Pet owners can update their own pets" ON public.pets
    FOR UPDATE USING (auth.uid() = owner_id);

-- Appointments table policies
CREATE POLICY "Users can view their own appointments" ON public.appointments
    FOR SELECT USING (auth.uid() = pet_owner_id OR auth.uid() = vet_id);

CREATE POLICY "Pet owners can create appointments" ON public.appointments
    FOR INSERT WITH CHECK (auth.uid() = pet_owner_id);

CREATE POLICY "Users can update their own appointments" ON public.appointments
    FOR UPDATE USING (auth.uid() = pet_owner_id OR auth.uid() = vet_id);

-- Reviews table policies
CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for their appointments" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Notifications table policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Messages table policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add a comment to mark the end of the migration
COMMENT ON SCHEMA public IS 'MobiPet Complete Database Schema - Migration completed successfully'; 