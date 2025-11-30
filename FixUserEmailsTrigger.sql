-- Create user_emails table if it doesn't exist
create table if not exists public.user_emails (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint user_emails_email_key unique (email)
);

-- Ensure user_id column exists (in case table already existed without it)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_emails' and column_name = 'user_id') then
        alter table public.user_emails add column user_id uuid references auth.users(id) on delete cascade;
    end if;
end $$;

-- Enable RLS
alter table public.user_emails enable row level security;

-- Allow public read access to user_emails (for deduplication check)
-- Drop policy if exists to avoid error
drop policy if exists "Allow public read access" on public.user_emails;
create policy "Allow public read access" on public.user_emails
  for select using (true);

-- Create a function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_emails (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users
insert into public.user_emails (user_id, email)
select id, email from auth.users
on conflict (email) do nothing;
