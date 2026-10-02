INSERT INTO public.permissions (module, action, label, sort_order)
VALUES ('users', 'delete', 'Excluir usuários', 64)
ON CONFLICT (module, action) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON p.module = 'users' AND p.action = 'delete'
WHERE r.slug = 'administrador'
ON CONFLICT (role_id, permission_id) DO NOTHING;