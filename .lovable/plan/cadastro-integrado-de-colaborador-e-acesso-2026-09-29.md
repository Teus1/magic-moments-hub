# Cadastro integrado de colaborador e acesso

## Objetivo

Ao cadastrar um colaborador, criar também sua conta de acesso com a role **Colaborador**. Quando essa pessoa entrar, ela verá em **Minha agenda** somente os eventos em que foi escalada, os detalhes operacionais e seus próprios valores.

## Alterações

- No formulário de novo colaborador, incluir login e senha obrigatórios; a role Colaborador será aplicada automaticamente.
- Criar a conta, o perfil e o cadastro de colaborador em uma única ação protegida pelas permissões administrativas.
- Se alguma etapa falhar, desfazer o que foi criado para não deixar contas ou cadastros incompletos.
- Manter, na edição de colaboradores antigos, a opção de vincular uma conta já existente.
- Impedir que a mesma conta seja vinculada a mais de um colaborador.
- Manter a página **Minha agenda** existente, com eventos escalados, local, cliente, cerimonial, valor combinado, recebido e a receber.

## Detalhes técnicos

- A criação da conta ocorrerá no servidor, sem expor acesso administrativo no navegador.
- O vínculo continuará sendo feito por `collaborators.profile_id`, com leitura limitada pelas regras de acesso já existentes.
- A role `colaborador` e a permissão `portal.view` já existentes serão reutilizadas.
- O fluxo será validado criando uma conta de teste, entrando como colaborador e confirmando que somente sua própria escala aparece.
