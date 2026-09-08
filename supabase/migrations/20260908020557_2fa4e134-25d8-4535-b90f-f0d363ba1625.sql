INSERT INTO public.permissions (module, action, label, sort_order) VALUES ('calendar', 'view', 'Visualizar calendário', 0) ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.module = 'calendar' AND p.action = 'view'
  AND r.slug IN ('administrador', 'comercial')
ON CONFLICT DO NOTHING;