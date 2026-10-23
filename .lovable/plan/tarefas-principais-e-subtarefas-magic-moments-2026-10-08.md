# Tarefas principais e subtarefas — Magic Moments

## Validação de artes

- Substituir a organização por cliente por **tarefas principais**, como “Casamento Luiz e Laryssa”, sem vínculo obrigatório com Clientes ou Eventos.
- Cada tarefa principal terá **título obrigatório, data do evento obrigatória, responsável opcional e observações**. Remover Cliente, Descrição e Prazo separado.
- Dentro dela, permitir criar quantas subtarefas forem necessárias: arte da Polaroid, capa do caderno, páginas internas etc.
- Cada subtarefa terá **título obrigatório, responsável opcional, observações e status Pendente/Concluída**. Não terá cliente, descrição ou prazo próprio.
- A data do evento será a referência comum de todas as subtarefas. Alterar essa data na tarefa principal atualizará a referência de todas elas.

## Quadro e conclusão

- Manter as colunas **Pendente** e **Concluída**, mostrando os cartões das tarefas principais com data do evento, responsável e progresso, por exemplo “2 de 3 concluídas”.
- Ao abrir uma tarefa principal, mostrar suas informações e a lista de subtarefas, com ações de criar, editar, concluir, reabrir e excluir com confirmação.
- A tarefa principal ficará **concluída automaticamente quando tiver pelo menos uma subtarefa e todas estiverem concluídas**.
- Reabrir uma subtarefa ou adicionar uma pendente reabrirá a tarefa principal. Sem subtarefas, ela permanece pendente.
- Não permitir concluir ou arrastar a tarefa principal manualmente entre colunas, para respeitar a conclusão automática.
- Manter busca por título e observações e filtro por responsável; remover o filtro por cliente. A busca também encontrará as subtarefas dentro do agrupamento.
- Destacar a data vencida apenas em tarefas principais pendentes.

## Dia a dia

- Manter tarefas independentes, sem agrupamento ou subtarefas.
- Usar título, responsável opcional, observações e status; remover cliente, descrição e prazo.
- Preservar concluir/reabrir e arrastar entre Pendente e Concluída nessa aba.

## Preservação das tarefas

- Não apagar os registros existentes nem agrupar automaticamente pelo cliente, pois isso não identifica com segurança o evento.
- Preservar cada tarefa de arte existente como subtarefa de um agrupamento individual provisório, que poderá receber o título e a data corretos na edição.
- Não inventar datas de eventos. Agrupamentos migrados sem data terão indicação de data a definir; novos cadastros exigirão a data.
- Preservar responsáveis, status e observações. Incorporar descrições antigas às observações, identificadas como descrição anterior, sem sobrescrever o conteúdo existente.
- Confirmar a exclusão de uma tarefa principal informando que suas subtarefas também serão excluídas.

## Detalhes técnicos

- Aplicar uma migração aditiva para armazenar agrupamentos de artes e relacionar suas subtarefas, preservando os registros existentes e marcando campos retirados como descontinuados.
- Ajustar a regra de validação que exige cliente nas artes para permitir o novo modelo sem cliente.
- Calcular o estado das tarefas principais pelos estados das subtarefas, garantindo consistência após criação, edição, exclusão e reabertura.
- Manter permissões próprias de Tarefas, acesso interno restrito, proteção no banco e validação das alterações no servidor. Não ampliar o acesso de colaboradores.
- Atualizar os formulários, consultas e cartões, preservando a identidade visual Magic Moments.

## Validação

- Testar vários agrupamentos, várias subtarefas, responsáveis diferentes e observações.
- Conferir conclusão automática, reabertura e comportamento ao excluir a última subtarefa.
- Confirmar que a alteração da data principal aparece em todas as subtarefas e persiste ao reabrir a página.
- Verificar preservação das tarefas anteriores, filtros, permissões e uso em computador e celular.
