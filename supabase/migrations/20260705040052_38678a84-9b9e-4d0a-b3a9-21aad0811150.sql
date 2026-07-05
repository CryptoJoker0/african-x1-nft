
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) TO service_role;
