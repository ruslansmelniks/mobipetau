-- Notifications table for in-app and email notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  message text not null,
  type text not null,
  reference_id uuid,
  reference_type text,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user_id on notifications(user_id); 