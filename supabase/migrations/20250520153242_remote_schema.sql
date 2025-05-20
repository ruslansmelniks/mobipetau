create type "public"."appointment_status" as enum ('requested', 'confirmed', 'rejected', 'proposed_time', 'completed', 'cancelled', 'pending');

create table "public"."appointments" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "date" date,
    "time" time without time zone,
    "address" text,
    "status" text,
    "notes" text,
    "pet_owner_id" uuid,
    "vet_id" uuid,
    "payment_status" text,
    "payment_id" text,
    "payment_amount" numeric,
    "payment_method" text,
    "pet_id" uuid,
    "services" jsonb default '[]'::jsonb,
    "total_price" numeric default 0,
    "time_slot" text default ''::text,
    "latitude" numeric default 0,
    "longitude" numeric default 0,
    "additional_info" text default ''::text,
    "time_of_day" text default ''::text,
    "is_in_perth" boolean default true,
    "updated_at" timestamp with time zone default now(),
    "accepted_at" timestamp with time zone,
    "proposed_time" text,
    "proposed_message" text,
    "proposed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "completion_notes" text
);


alter table "public"."appointments" enable row level security;

create table "public"."appointments_backup" (
    "id" uuid,
    "created_at" timestamp with time zone,
    "date" date,
    "time" time without time zone,
    "address" text,
    "status" text,
    "notes" text,
    "pet_owner_id" uuid,
    "vet_id" uuid,
    "payment_status" text,
    "payment_id" text,
    "payment_amount" numeric,
    "payment_method" text,
    "pet_id" uuid,
    "services" jsonb
);


create table "public"."conversations" (
    "created_at" timestamp with time zone not null default now(),
    "participants" uuid[],
    "id" uuid not null default gen_random_uuid()
);


alter table "public"."conversations" enable row level security;

create table "public"."declined_jobs" (
    "id" uuid not null default uuid_generate_v4(),
    "vet_id" uuid not null,
    "appointment_id" uuid not null,
    "declined_at" timestamp with time zone not null default now()
);


alter table "public"."declined_jobs" enable row level security;

create table "public"."messages" (
    "created_at" timestamp with time zone not null default now(),
    "sender_id" uuid,
    "content" text,
    "timestamp" timestamp without time zone,
    "conversation_id" uuid,
    "id" uuid not null default gen_random_uuid()
);


alter table "public"."messages" enable row level security;

create table "public"."notifications" (
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid,
    "type" text,
    "seen" boolean,
    "appointment_id" uuid,
    "id" uuid not null default gen_random_uuid()
);


alter table "public"."notifications" enable row level security;

create table "public"."pets" (
    "created_at" timestamp with time zone not null default now(),
    "owner_id" uuid,
    "name" text,
    "image" text,
    "type" text,
    "id" uuid not null default gen_random_uuid(),
    "age" integer,
    "age_unit" text,
    "breed" text,
    "weight" smallint,
    "gender" text,
    "species" text,
    "medical_history" text
);


alter table "public"."pets" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "role" text default 'pet_owner'::text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."profiles" enable row level security;

create table "public"."users" (
    "created_at" timestamp with time zone not null default now(),
    "name" text,
    "role" text,
    "email" text,
    "id" uuid not null default gen_random_uuid(),
    "first_name" text,
    "last_name" text,
    "phone" text,
    "address" text,
    "city" text,
    "state" text,
    "postal_code" text,
    "emergency_contact" text,
    "emergency_phone" text,
    "additional_info" text
);


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id);

CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id);

CREATE UNIQUE INDEX declined_jobs_pkey ON public.declined_jobs USING btree (id);

CREATE UNIQUE INDEX declined_jobs_vet_id_appointment_id_key ON public.declined_jobs USING btree (vet_id, appointment_id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX pets_pkey ON public.pets USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE INDEX users_email_idx ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE INDEX users_role_idx ON public.users USING btree (role);

alter table "public"."appointments" add constraint "appointments_pkey" PRIMARY KEY using index "appointments_pkey";

alter table "public"."conversations" add constraint "conversations_pkey" PRIMARY KEY using index "conversations_pkey";

alter table "public"."declined_jobs" add constraint "declined_jobs_pkey" PRIMARY KEY using index "declined_jobs_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."pets" add constraint "pets_pkey" PRIMARY KEY using index "pets_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."appointments" add constraint "appointments_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES pets(id) not valid;

alter table "public"."appointments" validate constraint "appointments_pet_id_fkey";

alter table "public"."appointments" add constraint "appointments_pet_owner_id_fkey" FOREIGN KEY (pet_owner_id) REFERENCES users(id) not valid;

alter table "public"."appointments" validate constraint "appointments_pet_owner_id_fkey";

alter table "public"."appointments" add constraint "appointments_vet_id_fkey" FOREIGN KEY (vet_id) REFERENCES users(id) not valid;

alter table "public"."appointments" validate constraint "appointments_vet_id_fkey";

alter table "public"."declined_jobs" add constraint "declined_jobs_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id) not valid;

alter table "public"."declined_jobs" validate constraint "declined_jobs_appointment_id_fkey";

alter table "public"."declined_jobs" add constraint "declined_jobs_vet_id_appointment_id_key" UNIQUE using index "declined_jobs_vet_id_appointment_id_key";

alter table "public"."declined_jobs" add constraint "declined_jobs_vet_id_fkey" FOREIGN KEY (vet_id) REFERENCES auth.users(id) not valid;

alter table "public"."declined_jobs" validate constraint "declined_jobs_vet_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.cleanup_draft_appointments()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM appointments 
  WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '24 hours';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_drafts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Delete pending appointments older than 24 hours
  DELETE FROM appointments
  WHERE status = 'pending'
  AND updated_at < NOW() - INTERVAL '24 hours';
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_cleanup_trigger()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Drop the existing trigger if it exists
  DROP TRIGGER IF EXISTS trigger_cleanup_old_drafts ON appointments;
  
  -- Create the trigger
  CREATE TRIGGER trigger_cleanup_old_drafts
  AFTER INSERT ON appointments
  EXECUTE PROCEDURE cleanup_old_drafts();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.debug_column_exists(p_table_name text, p_column_name text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = p_table_name
      AND column_name = p_column_name
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    created_at,
    first_name,
    last_name,
    phone,
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'pet_owner')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If the user already exists, log it and continue
    RAISE NOTICE 'User with ID % already exists in the users table', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log any other errors
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- This function doesn't actually do anything server-side,
  -- but it forces a schema reload when called via PostgREST
  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_appointment(p_id uuid, p_services jsonb DEFAULT NULL::jsonb, p_notes text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_total_price numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSONB;
  col_check BOOLEAN;
BEGIN
  -- Check if services column exists
  SELECT debug_column_exists('appointments', 'services') INTO col_check;
  
  IF NOT col_check THEN
    RETURN jsonb_build_object('error', 'Column services does not exist');
  END IF;
  
  -- Perform the update with dynamic SQL to be safe
  BEGIN
    UPDATE appointments
    SET 
      services = COALESCE(p_services, services),
      notes = COALESCE(p_notes, notes),
      address = COALESCE(p_address, address),
      total_price = COALESCE(p_total_price, total_price)
    WHERE id = p_id
      AND pet_owner_id = auth.uid();
    
    SELECT jsonb_build_object(
      'success', true,
      'appointment_id', id
    ) INTO result
    FROM appointments
    WHERE id = p_id
      AND pet_owner_id = auth.uid();
    
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$
;

grant delete on table "public"."appointments" to "anon";

grant insert on table "public"."appointments" to "anon";

grant references on table "public"."appointments" to "anon";

grant select on table "public"."appointments" to "anon";

grant trigger on table "public"."appointments" to "anon";

grant truncate on table "public"."appointments" to "anon";

grant update on table "public"."appointments" to "anon";

grant delete on table "public"."appointments" to "authenticated";

grant insert on table "public"."appointments" to "authenticated";

grant references on table "public"."appointments" to "authenticated";

grant select on table "public"."appointments" to "authenticated";

grant trigger on table "public"."appointments" to "authenticated";

grant truncate on table "public"."appointments" to "authenticated";

grant update on table "public"."appointments" to "authenticated";

grant delete on table "public"."appointments" to "service_role";

grant insert on table "public"."appointments" to "service_role";

grant references on table "public"."appointments" to "service_role";

grant select on table "public"."appointments" to "service_role";

grant trigger on table "public"."appointments" to "service_role";

grant truncate on table "public"."appointments" to "service_role";

grant update on table "public"."appointments" to "service_role";

grant delete on table "public"."appointments_backup" to "anon";

grant insert on table "public"."appointments_backup" to "anon";

grant references on table "public"."appointments_backup" to "anon";

grant select on table "public"."appointments_backup" to "anon";

grant trigger on table "public"."appointments_backup" to "anon";

grant truncate on table "public"."appointments_backup" to "anon";

grant update on table "public"."appointments_backup" to "anon";

grant delete on table "public"."appointments_backup" to "authenticated";

grant insert on table "public"."appointments_backup" to "authenticated";

grant references on table "public"."appointments_backup" to "authenticated";

grant select on table "public"."appointments_backup" to "authenticated";

grant trigger on table "public"."appointments_backup" to "authenticated";

grant truncate on table "public"."appointments_backup" to "authenticated";

grant update on table "public"."appointments_backup" to "authenticated";

grant delete on table "public"."appointments_backup" to "service_role";

grant insert on table "public"."appointments_backup" to "service_role";

grant references on table "public"."appointments_backup" to "service_role";

grant select on table "public"."appointments_backup" to "service_role";

grant trigger on table "public"."appointments_backup" to "service_role";

grant truncate on table "public"."appointments_backup" to "service_role";

grant update on table "public"."appointments_backup" to "service_role";

grant delete on table "public"."conversations" to "anon";

grant insert on table "public"."conversations" to "anon";

grant references on table "public"."conversations" to "anon";

grant select on table "public"."conversations" to "anon";

grant trigger on table "public"."conversations" to "anon";

grant truncate on table "public"."conversations" to "anon";

grant update on table "public"."conversations" to "anon";

grant delete on table "public"."conversations" to "authenticated";

grant insert on table "public"."conversations" to "authenticated";

grant references on table "public"."conversations" to "authenticated";

grant select on table "public"."conversations" to "authenticated";

grant trigger on table "public"."conversations" to "authenticated";

grant truncate on table "public"."conversations" to "authenticated";

grant update on table "public"."conversations" to "authenticated";

grant delete on table "public"."conversations" to "service_role";

grant insert on table "public"."conversations" to "service_role";

grant references on table "public"."conversations" to "service_role";

grant select on table "public"."conversations" to "service_role";

grant trigger on table "public"."conversations" to "service_role";

grant truncate on table "public"."conversations" to "service_role";

grant update on table "public"."conversations" to "service_role";

grant delete on table "public"."declined_jobs" to "anon";

grant insert on table "public"."declined_jobs" to "anon";

grant references on table "public"."declined_jobs" to "anon";

grant select on table "public"."declined_jobs" to "anon";

grant trigger on table "public"."declined_jobs" to "anon";

grant truncate on table "public"."declined_jobs" to "anon";

grant update on table "public"."declined_jobs" to "anon";

grant delete on table "public"."declined_jobs" to "authenticated";

grant insert on table "public"."declined_jobs" to "authenticated";

grant references on table "public"."declined_jobs" to "authenticated";

grant select on table "public"."declined_jobs" to "authenticated";

grant trigger on table "public"."declined_jobs" to "authenticated";

grant truncate on table "public"."declined_jobs" to "authenticated";

grant update on table "public"."declined_jobs" to "authenticated";

grant delete on table "public"."declined_jobs" to "service_role";

grant insert on table "public"."declined_jobs" to "service_role";

grant references on table "public"."declined_jobs" to "service_role";

grant select on table "public"."declined_jobs" to "service_role";

grant trigger on table "public"."declined_jobs" to "service_role";

grant truncate on table "public"."declined_jobs" to "service_role";

grant update on table "public"."declined_jobs" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."pets" to "anon";

grant insert on table "public"."pets" to "anon";

grant references on table "public"."pets" to "anon";

grant select on table "public"."pets" to "anon";

grant trigger on table "public"."pets" to "anon";

grant truncate on table "public"."pets" to "anon";

grant update on table "public"."pets" to "anon";

grant delete on table "public"."pets" to "authenticated";

grant insert on table "public"."pets" to "authenticated";

grant references on table "public"."pets" to "authenticated";

grant select on table "public"."pets" to "authenticated";

grant trigger on table "public"."pets" to "authenticated";

grant truncate on table "public"."pets" to "authenticated";

grant update on table "public"."pets" to "authenticated";

grant delete on table "public"."pets" to "service_role";

grant insert on table "public"."pets" to "service_role";

grant references on table "public"."pets" to "service_role";

grant select on table "public"."pets" to "service_role";

grant trigger on table "public"."pets" to "service_role";

grant truncate on table "public"."pets" to "service_role";

grant update on table "public"."pets" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

-- Drop all existing policies for users table
DROP POLICY IF EXISTS "Allow full access to admins" ON "public"."users";
DROP POLICY IF EXISTS "Enable read access for users" ON "public"."users";
DROP POLICY IF EXISTS "Enable insert for users" ON "public"."users";
DROP POLICY IF EXISTS "Enable update for users" ON "public"."users";
DROP POLICY IF EXISTS "Enable delete for users" ON "public"."users";
DROP POLICY IF EXISTS "Admins can view all users" ON "public"."users";
DROP POLICY IF EXISTS "Admins can update all users" ON "public"."users";
DROP POLICY IF EXISTS "Admins can delete users" ON "public"."users";
DROP POLICY IF EXISTS "Users can view their own data" ON "public"."users";
DROP POLICY IF EXISTS "Users can update their own data" ON "public"."users";
DROP POLICY IF EXISTS "Users can insert their own data" ON "public"."users";
DROP POLICY IF EXISTS "admin_all" ON "public"."users";
DROP POLICY IF EXISTS "users_read_own" ON "public"."users";
DROP POLICY IF EXISTS "users_update_own" ON "public"."users";

-- Admin access policy using JWT claims (app_metadata or user_metadata)
CREATE POLICY "admin_all" ON "public"."users"
FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
  (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
);

-- User can read their own data
CREATE POLICY "users_read_own" ON "public"."users"
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- User can update their own data
CREATE POLICY "users_update_own" ON "public"."users"
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow pet owner or vet to update appointment
CREATE POLICY "Allow pet owner or vet to update appointment"
ON "public"."appointments"
AS PERMISSIVE
FOR UPDATE
TO public
USING (((auth.uid() = pet_owner_id) OR (auth.uid() = vet_id)));


CREATE POLICY "Allow pet owner or vet to view their appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR SELECT
TO public
USING (((auth.uid() = pet_owner_id) OR (auth.uid() = vet_id)));


CREATE POLICY "Allow pet owner to create appointment"
ON "public"."appointments"
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((auth.uid() = pet_owner_id));


CREATE POLICY "Allow pet owners to insert appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = pet_owner_id));


CREATE POLICY "Allow pet owners to read their appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING ((auth.uid() = pet_owner_id));


CREATE POLICY "Allow pet owners to update their appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING ((auth.uid() = pet_owner_id));


CREATE POLICY "Allow select for all"
ON "public"."appointments"
AS PERMISSIVE
FOR SELECT
TO public
USING (true);


CREATE POLICY "Allow select for owner"
ON "public"."appointments"
AS PERMISSIVE
FOR SELECT
TO public
USING ((pet_owner_id = auth.uid()));


CREATE POLICY "Allow users to read their draft appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR SELECT
TO public
USING (((pet_owner_id = auth.uid()) AND (status = 'pending'::text)));


CREATE POLICY "Allow users to update their own appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR UPDATE
TO public
USING ((pet_owner_id = auth.uid()))
WITH CHECK ((pet_owner_id = auth.uid()));


CREATE POLICY "Pet owners can view their own appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() = pet_owner_id));


CREATE POLICY "Users can create their own appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((auth.uid() = pet_owner_id));


CREATE POLICY "Users can update own appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR UPDATE
TO public
USING ((auth.uid() = pet_owner_id));


CREATE POLICY "Users can update their own appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR UPDATE
TO public
USING ((auth.uid() = pet_owner_id));


CREATE POLICY "Users can view their own appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() = pet_owner_id));


CREATE POLICY "Vets can update their own appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR UPDATE
TO public
USING (((vet_id = auth.uid()) OR (status = 'waiting_for_vet'::text)))
WITH CHECK (true);


CREATE POLICY "Vets can view appointments"
ON "public"."appointments"
AS PERMISSIVE
FOR SELECT
TO public
USING ((((status = 'waiting_for_vet'::text) AND (NOT (EXISTS ( SELECT 1
   FROM declined_jobs
  WHERE ((declined_jobs.appointment_id = appointments.id) AND (declined_jobs.vet_id = auth.uid())))))) OR (vet_id = auth.uid())));


CREATE POLICY "Allow user to read own conversations"
ON "public"."conversations"
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() = ANY (participants)));


CREATE POLICY "Vets can add their own declines"
ON "public"."declined_jobs"
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((auth.uid() = vet_id));


CREATE POLICY "Vets can view their own declines"
ON "public"."declined_jobs"
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() = vet_id));


CREATE POLICY "Allow user to read messages in their conversations"
ON "public"."messages"
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() = sender_id));


CREATE POLICY "Allow user to send messages"
ON "public"."messages"
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((auth.uid() = sender_id));


CREATE POLICY "Allow user to read notifications"
ON "public"."notifications"
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() = user_id));


CREATE POLICY "Allow user to update notification"
ON "public"."notifications"
AS PERMISSIVE
FOR UPDATE
TO public
USING ((auth.uid() = user_id));


CREATE POLICY "Service role can create notifications"
ON "public"."notifications"
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);


CREATE POLICY "Users can view their own notifications"
ON "public"."notifications"
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() = user_id));


CREATE POLICY "Allow pet owner to add pet"
ON "public"."pets"
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((auth.uid() = owner_id));


CREATE POLICY "Allow pet owner to update pet"
ON "public"."pets"
AS PERMISSIVE
FOR UPDATE
TO public
USING ((auth.uid() = owner_id));


CREATE POLICY "Allow pet owner to view their pets"
ON "public"."pets"
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() = owner_id));


CREATE POLICY "Anyone can insert profile"
ON "public"."profiles"
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);


CREATE POLICY "Anyone can insert profiles"
ON "public"."profiles"
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);


CREATE POLICY "Users can read their own profile"
ON "public"."profiles"
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() = id));


CREATE POLICY "Users can read/update own profile"
ON "public"."profiles"
AS PERMISSIVE
FOR ALL
TO public
USING ((auth.uid() = id));


CREATE POLICY "Users can update their own profile"
ON "public"."profiles"
AS PERMISSIVE
FOR UPDATE
TO public
USING ((auth.uid() = id));


CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_cleanup_old_drafts AFTER INSERT ON public.appointments FOR EACH STATEMENT EXECUTE FUNCTION cleanup_old_drafts();


