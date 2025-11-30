-- Drop existing trigger and function to ensure clean slate
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Ensure table exists with correct schema
create table if not exists public.user_emails (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint user_emails_email_key unique (email)
);

-- Ensure user_id column exists (idempotent check)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_emails' and column_name = 'user_id') then
        alter table public.user_emails add column user_id uuid references auth.users(id) on delete cascade;
    end if;
end $$;

-- Enable RLS
alter table public.user_emails enable row level security;

-- Policy for reading (public) - Drop first to avoid error
drop policy if exists "Allow public read access" on public.user_emails;
create policy "Allow public read access" on public.user_emails for select using (true);

-- Function to handle new user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_emails (user_id, email)
  values (new.id, new.email)
  on conflict (email) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users
insert into public.user_emails (user_id, email)
select id, email from auth.users
on conflict (email) do nothing;

-- Grant permissions to ensure the trigger can write
grant all on public.user_emails to service_role;
grant select on public.user_emails to anon, authenticated;
grant insert on public.user_emails to postgres; 
