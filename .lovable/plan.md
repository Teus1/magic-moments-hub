# Tarefas — Magic Moments

## Organização
- Adicionar **Tarefas** como item independente do menu, abaixo de Configurações.
- Separar a página em duas abas: **Validação de artes** e **Dia a dia**.
- Cada aba terá um quadro Kanban com apenas **Pendente** e **Concluída**, com contagem de tarefas em cada coluna.

## Cadastro e acompanhamento
- Permitir criar diversas tarefas, sem limite fixo de quantidade por cliente.
- Campos: **título obrigatório**, descrição, observações, responsável opcional e prazo opcional.
- Em **Validação de artes**, exigir o vínculo com um cliente cadastrado. Exemplo: três tarefas para o mesmo cliente — arte da polaroide, capa do caderno e páginas internas.
- Em **Dia a dia**, não exigir cliente, permitindo acompanhar compras, equipamentos e outras atividades internas.
- Usar **observações** para registrar o andamento, como “aguardando resposta do cliente”, sem criar outras etapas.
- Permitir abrir e editar tarefas, concluir, reabrir e excluir com confirmação.
- Mover tarefas entre as colunas por arrastar e soltar, com opção de concluir/reabrir por botão também.
- Exibir título, cliente quando houver, responsável e prazo nos cartões; destacar prazos vencidos apenas em tarefas pendentes.
- Incluir busca e filtros por cliente e responsável, com estados vazios e mensagens de erro claras.

## Acesso
- Acesso apenas à **equipe interna autorizada**, conforme permissões próprias de Tarefas: visualizar, criar, editar e excluir.
- Administrador terá todas as permissões; outros grupos poderão recebê-las pela tela de Roles e permissões.
- Não liberar tarefas para colaboradores por padrão, nem alterar Minha agenda.

## Fora desta etapa
- Anexos de artes, aprovação formal, acesso do cliente, notificações e tarefas recorrentes.
- As validações serão acompanhadas manualmente pelo status e pelas observações.

## Detalhes técnicos
- Criar a página protegida `/tarefas`, preservando o menu e a identidade visual atuais.
- Criar tabela própria com categoria, status, cliente, responsável, prazo, descrição, observações e datas de criação/conclusão.
- Aplicar permissões na interface e no banco, com RLS e concessões explícitas, sem acesso anônimo.
- Referenciar clientes e perfis existentes; preservar tarefas ao excluir uma conta, removendo apenas o vínculo com ela, e impedir exclusão de cliente vinculado sem antes tratar suas tarefas.
- Disponibilizar somente os dados mínimos de responsáveis aos usuários autorizados em Tarefas, sem conceder acesso geral ao gerenciamento de usuários.
- Utilizar biblioteca de arrastar e soltar com suporte a teclado; persistir mudanças de status e restaurar o cartão se houver falha ao salvar.

## Validação
- Testar várias tarefas para o mesmo cliente e tarefas internas sem cliente.
- Confirmar persistência de observações, responsável, prazo e status ao reabrir a página.
- Testar concluir, reabrir, mover e excluir tarefas, além das restrições de acesso.
- Conferir o quadro em computador e celular, mantendo os controles utilizáveis em ambos.