-- EMERGENCY FIX
-- 1. Disable the trigger first to ensure signups can happen even if this script fails partway
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. Ensure extensions exist
create extension if not exists pgcrypto;

-- 3. Recreate table with simple schema
create table if not exists public.user_emails (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint user_emails_email_key unique (email)
);

-- 4. Enable RLS
alter table public.user_emails enable row level security;

-- 5. Policies
drop policy if exists "Allow public read access" on public.user_emails;
create policy "Allow public read access" on public.user_emails for select using (true);

drop policy if exists "Allow service_role full access" on public.user_emails;
create policy "Allow service_role full access" on public.user_emails using (true) with check (true);

-- 6. Create function with explicit permissions and ownership
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_emails (user_id, email)
  values (new.id, new.email)
  on conflict (email) do nothing;
  return new;
exception when others then
  -- Catch ALL errors to prevent blocking signup
  raise warning 'Error in handle_new_user: %', SQLERRM;
  return new;
end;
$$ language plpgsql security definer;

-- 7. Set owner and permissions explicitly
alter function public.handle_new_user() owner to postgres;
grant execute on function public.handle_new_user() to anon, authenticated, service_role;

-- 8. Re-attach trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. Grant table permissions
grant all on public.user_emails to postgres, service_role;
grant select on public.user_emails to anon, authenticated;
