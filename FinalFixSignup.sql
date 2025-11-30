-- 1. Clean up everything first to ensure a fresh start
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.user_emails;

-- 2. Create the table with the correct schema
create table public.user_emails (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint user_emails_email_key unique (email)
);

-- 3. Enable RLS and allow public read access (needed for the frontend check)
alter table public.user_emails enable row level security;
create policy "Allow public read access" on public.user_emails for select using (true);

-- 4. Create the function with EXCEPTION HANDLING
-- This is critical: if the insert fails for any reason, we catch the error
-- so we don't block the user signup process.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  begin
    insert into public.user_emails (user_id, email)
    values (new.id, new.email)
    on conflict (email) do nothing;
  exception when others then
    -- Log the error if possible, or just ignore it to allow signup to proceed
    raise warning 'Failed to insert into user_emails: %', SQLERRM;
  end;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 5. Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Grant permissions
grant all on public.user_emails to service_role;
grant select on public.user_emails to anon, authenticated;
grant insert on public.user_emails to postgres;

-- 7. Backfill existing users (safely)
insert into public.user_emails (user_id, email)
select id, email from auth.users
on conflict (email) do nothing;
