-- 1. Manually confirm ALL users (so you can log in without clicking email link)
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- 2. Manually populate user_emails for these users
-- (Since we disabled the trigger, we must do this manually for now)
insert into public.user_emails (user_id, email)
select id, email from auth.users
on conflict (email) do nothing;
