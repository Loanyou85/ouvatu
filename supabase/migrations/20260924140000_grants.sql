-- Explicit privileges for the Data API roles.
-- Recent Supabase projects no longer grant table privileges automatically to
-- `authenticated` for tables created in SQL: signed-in users then get
-- "permission denied" even though RLS policies exist. Row Level Security still
-- restricts every row to its owner (user_id = auth.uid()).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- Profile: plan and analysis_count stay server-controlled (webhook / security-definer functions).
revoke insert, update, delete on public.users from authenticated;
grant update (name, avatar_url, onboarding_completed, interests) on public.users to authenticated;

-- Subscriptions and projections are written only by the service role / triggers.
revoke insert, update, delete on public.subscriptions from authenticated;
