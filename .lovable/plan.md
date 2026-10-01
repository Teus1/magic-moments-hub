# Exclusão definitiva de usuários

## Objetivo
Permitir que usuários autorizados excluam uma conta definitivamente pela tela de Usuários, além de apenas desativá-la.

## Alterações
- Adicionar a ação **Excluir** na lista de usuários, com confirmação clara de que a conta perderá o acesso.
- Executar a exclusão em uma ação protegida no servidor, validando a permissão de exclusão de usuários.
- Impedir que a pessoa conectada exclua a própria conta.
- Preservar dados operacionais: quando houver um colaborador vinculado, remover apenas o vínculo de acesso antes de apagar a conta.
- Atualizar a lista após a exclusão e exibir mensagens de sucesso ou erro.
- Validar o fluxo e a apresentação em desktop e celular.

## Detalhes técnicos
- A conta de autenticação será apagada usando acesso administrativo somente no servidor.
- O perfil será removido junto da conta; referências históricas serão mantidas conforme as regras existentes da base.
- A confirmação usará o componente de diálogo já existente no aplicativo.
