# Vincular novo colaborador a uma conta existente

## Objetivo

Ao cadastrar um colaborador, permitir escolher entre criar uma nova conta de acesso ou vincular uma conta já cadastrada.

## Alterações

- Adicionar no formulário de novo colaborador as opções **Criar nova conta** e **Vincular conta existente**.
- Na vinculação, listar somente contas disponíveis e impedir que uma conta fique ligada a dois colaboradores.
- Manter a criação atual de login e senha com a role Colaborador.
- Exigir as permissões adequadas e salvar o vínculo de forma protegida.
- Manter a edição atual para trocar ou remover o vínculo quando permitido.
- Validar cadastro, mensagens de erro e acesso à Minha agenda.

## Detalhes técnicos

- Criar uma ação protegida no servidor para cadastrar o colaborador usando um perfil existente.
- Reforçar a unicidade de `collaborators.profile_id` no banco para impedir vínculos duplicados mesmo em operações simultâneas.
- Filtrar no seletor contas já vinculadas, preservando a conta do próprio colaborador durante edição.
