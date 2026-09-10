REVOKE EXECUTE ON FUNCTION public.my_collaborator_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_scheduled_for_event(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_client_of_my_events(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_collaborator_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_scheduled_for_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client_of_my_events(uuid) TO authenticated;