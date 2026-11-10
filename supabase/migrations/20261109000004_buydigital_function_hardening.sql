-- Pin the search path of the updated_at trigger function
alter function buydigital.set_updated_at() set search_path = '';
-- Trigger functions are only ever run by their triggers; nobody should be able to call them directly through the API
revoke all on function buydigital.notify_ticket_reply() from public, anon, authenticated;
revoke all on function buydigital.guard_profile_status() from public, anon, authenticated;
