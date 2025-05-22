-- Add clinical record fields to appointments table
alter table appointments add column if not exists clinical_notes text;         -- shared with owner
alter table appointments add column if not exists vet_notes text;              -- confidential, vet-only 