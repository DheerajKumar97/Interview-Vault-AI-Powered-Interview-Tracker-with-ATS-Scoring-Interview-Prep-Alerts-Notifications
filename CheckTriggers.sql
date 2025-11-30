-- Inspect triggers on auth.users
select 
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement,
    action_orientation,
    action_timing
from information_schema.triggers
where event_object_table = 'users'
and event_object_schema = 'auth';

-- Also check for any other functions that might be causing issues
select 
    proname, 
    prosrc 
from pg_proc 
where proname = 'handle_new_user';
