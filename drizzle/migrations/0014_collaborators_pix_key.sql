ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS pix_key text;
COMMENT ON COLUMN public.collaborators.pix_key IS 'Chave Pix atual do colaborador para consulta nos pagamentos da equipe dos eventos.';
COMMENT ON COLUMN public.collaborators.phone IS 'DEPRECATED: retirado do cadastro de colaboradores; contato atual pelo WhatsApp. Histórico preservado.';
COMMENT ON COLUMN public.collaborators.email IS 'DEPRECATED: retirado do cadastro de colaboradores. E-mail de contas de acesso permanece independente nos perfis.';