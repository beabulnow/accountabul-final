-- The preceding rollback removed the unintended probe tables. Remove the
-- generic trigger function that the probe left behind, but fail safely if an
-- unexpected dependency has appeared instead of cascading into other objects.
drop function if exists public.update_updated_at_column();

