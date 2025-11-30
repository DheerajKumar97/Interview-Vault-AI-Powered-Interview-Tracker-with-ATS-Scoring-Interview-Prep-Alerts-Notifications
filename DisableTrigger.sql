-- 1. Drop the trigger temporarily
-- This will help us confirm if the trigger is the cause of the 500 error.
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Verify table exists (just a select)
select count(*) from public.user_emails;
