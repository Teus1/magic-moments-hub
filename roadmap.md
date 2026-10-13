# Roadmap

- [ ] Permitir nomear e excluir links de fichas sem apagar clientes ou eventos; gerar endereço curto no domínio próprio e validar o fluxo

- [x] Integrar pré-cadastro por link seguro, recebimento e revisão na tela de Clientes sem duplicar ou sobrescrever registros
- [x] Reorganizar formulários de Clientes e Eventos, retirar Telefone e reutilizar Google Maps com localização persistida
- [x] Implementar duração e término calculado preservando eventos e agenda existentes
- [x] Validar envio público real pelo celular, confirmação após recarga, CPF, data manual e regressões (19 testes)
- [ ] Validar revisão interna, criação sugerida, edição de evento e sugestões reais do Maps — aguarda sessão autenticada do usuário

- [x] Revisar vínculos e proteções existentes e conectar Google Drive para backups
- [ ] Aprovar o plano de preservação e backup semanal completo
- [ ] Implementar proteção contra exclusões acidentais e backups com histórico de execução
- [ ] Validar uma cópia completa e recuperação em ambiente separado antes de ativar a rotina publicada

- [x] Criar agenda mensal/diária de 24 horas e compromissos obrigatoriamente vinculados a eventos
- [x] Aplicar permissões de Eventos aos compromissos e preservar informações e financeiro
- [x] Testar horários, vínculo obrigatório, persistência, regras de permissões e telas do calendário; simultâneos e meia-noite validados, registros temporários removidos

- [x] Implementar seleção mensal, resumo financeiro e gráfico anual no Dashboard
- [x] Exibir lista paginada do mês e apenas um botão Novo evento
- [x] Testar cálculos, navegação de período e telas do Dashboard financeiro; detalhes e paginação conferidos com dados simulados sem alterar registros

- [x] Refinar visual do Dashboard: cabeçalho, indicadores, próximos eventos e resumos compactos sem alterar consultas ou cálculos
- [x] Refinar sidebar mantendo destinos, permissões e expansão de Configurações
- [x] Verificar indicadores disponíveis, estados vazios, Novo evento, navegação e visual do Dashboard no computador, tablet e celular
- [ ] Validar listas preenchidas e detalhes com eventos reais — a sessão disponível não possui eventos cadastrados

- [x] Vincular a conexão própria do Google Maps e aplicar suas credenciais ao mapa, buscas e trajetos
- [x] Autorizar os dois domínios próprios no mapa, preservando o bloqueio dos endereços privados de desenvolvimento
- [ ] Validar mapa, sugestões e trajeto reais no domínio próprio publicado — depende de publicação e conferência do usuário

- [x] Reorganizar artes em tarefas principais e subtarefas, com data comum e conclusão automática
- [x] Simplificar Dia a dia e preservar registros anteriores
- [x] Validar agrupamentos, persistência e telas; manter as permissões existentes

- [x] Criar quadros de Validação de artes e Dia a dia com cadastro, observações e movimentação
- [x] Aplicar permissões próprias de Tarefas e acesso interno restrito
- [x] Validar tarefas, persistência e acessos no computador e celular

- [x] Adicionar sugestões de locais do Google Maps na origem e no destino
- [x] Verificar controles da busca sem consultas reais ao Google Maps
- [ ] Validar sugestões reais em domínio autorizado — depende do usuário

- [x] Criar calculador de deslocamento com combustível, ida e volta e pedágios estimados
- [x] Verificar cálculos, controles e acesso autenticado sem consultas Google Maps
- [ ] Validar trajeto e tarifas reais no endereço publicado autorizado — depende de conferência do usuário

- [x] Criar a página Minha agenda com eventos escalados e valores individuais
- [x] Exibir detalhes operacionais, cliente, cerimonial, serviço e local
- [x] Validar permissões, navegação e visual em desktop e celular
- [x] Unificar a criação de colaborador com sua conta de acesso e role Colaborador
- [x] Garantir vínculo único entre colaborador e conta
- [ ] Validar cadastro, login e visualização restrita da Minha agenda
- [x] Permitir exclusão definitiva de usuários com confirmação e proteção da própria conta
- [x] Adicionar anexos privados de comprovantes e documentos aos eventos
- [x] Validar múltiplos anexos, download, exclusão, limite de 20 MB e visual móvel
