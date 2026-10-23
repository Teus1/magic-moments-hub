# Calendário com agenda diária e compromissos operacionais

## Objetivo

Manter a visão mensal e os detalhes dos eventos, acrescentando uma visão do dia com as 24 horas, inspirada na organização do Google Agenda e integrada ao próprio sistema.

## Experiência no calendário

- Alternar entre **Mês** e **Dia**, com navegação anterior/próximo e botão **Hoje**.
- Clicar em qualquer dia, mesmo vazio, abre sua agenda diária na própria página, com retorno fácil ao mês.
- Mostrar a faixa completa de **00:00 até 24:00**, com rolagem, horários bem identificados e blocos posicionados conforme início e término.
- Exibir eventos e compromissos operacionais juntos, distinguindo-os visualmente sem abandonar a identidade Magic Moments.
- Organizar itens simultâneos lado a lado, sem ocultar um atrás do outro. Itens sem horário ficam em uma faixa separada, sem inventar horários.
- Preservar as informações de evento disponíveis hoje ao clicar nele: cliente, serviço, horário, local, status e Caderno de Memórias.
- Mostrar eventos e compromissos também no mês, com horário quando disponível e indicação de itens adicionais em dias cheios.

## Montagem, chegada antecipada e outros compromissos

- Criar compromissos pelo botão **Novo compromisso** ou ao clicar em um horário livre, preenchendo a data e o horário selecionados.
- Todo compromisso será **obrigatoriamente vinculado a um evento cadastrado**, conforme sua escolha.
- Campos: evento, título livre (como “Montagem” ou “Chegada antecipada”), data e hora de início e término, local opcional e observações opcionais.
- Permitir vários compromissos para o mesmo evento, inclusive em dias anteriores ou posteriores e atravessando a meia-noite.
- Clicar no compromisso abre seus detalhes, com edição e exclusão mediante confirmação, quando autorizado.
- Compromissos terão horários próprios: alterar o horário do evento não muda silenciosamente uma montagem ou chegada já registrada.
- Esses registros não criam novos eventos comerciais nem modificam valores, recebimentos ou indicadores financeiros.

## Permissões e preservação

- Manter a permissão atual de acesso ao Calendário.
- Criação, edição e exclusão dos compromissos seguem as respectivas permissões de **Eventos**, sem criar uma nova matriz de permissões.
- Exigir autorização no servidor e no banco, além de controlar os botões da tela; não ampliar o acesso de colaboradores à Minha agenda.
- Preservar os registros existentes. Eventos cancelados e seus compromissos devem ser identificados como cancelados, sem apagar compromissos automaticamente ao cancelar.
- A exclusão definitiva de um evento remove seus compromissos vinculados; o aviso de exclusão deve informar essa consequência.

## Direção visual

- Agenda ampla, limpa e legível, com controles compactos e hierarquia de horários semelhante ao Google Agenda, sem copiar sua marca.
- Preservar sidebar roxa, fundos claros, tipografia e cores oficiais; diferenciações discretas entre evento e compromisso.
- Adaptar a visão diária e seus formulários ao computador e ao celular, sem sobreposição de textos ou rolagem horizontal da página.

## Detalhes técnicos

- Manter a página protegida `/calendario`; usar uma biblioteca consolidada de calendário, como FullCalendar, para as visões mensal e diária e o tratamento de sobreposições, sem habilitar arrastar/redimensionar nesta etapa.
- Criar uma tabela própria de compromissos vinculada a `events`, com início/fim, título, local, observações e auditoria; incluir concessões explícitas e RLS na mesma migração.
- Usar funções autenticadas para consultas e alterações, validando a permissão correspondente de Eventos e o acesso ao evento vinculado. As leituras do calendário continuam limitadas ao que cada conta pode visualizar.
- Carregar todos os itens do período visível com paginação interna, inclusive compromissos que começam antes dele e terminam dentro dele.
- Tratar os horários operacionais no fuso **America/Sao_Paulo** e as datas de eventos sem conversões que desloquem o dia; respeitar eventos noturnos que atravessam a meia-noite.
- Atualizar a agenda após salvar, editar ou excluir, com mensagens claras em caso de falha e estados de carregamento, vazio e erro.

## Validação

- Testar navegação mensal/diária, dias vazios, 00:00 e final do dia, horários simultâneos e passagem pela meia-noite.
- Testar criação de montagem e chegada antecipada vinculadas ao mesmo evento, edição, persistência após recarregar e exclusão.
- Testar obrigatoriedade do vínculo com evento, término posterior ao início e bloqueio de alterações sem permissão.
- Confirmar que eventos e valores existentes não são alterados e que colaboradores não recebem acesso adicional.
- Verificar a apresentação no computador e no celular.

## Fora desta etapa

Sincronização com o Google Agenda, notificações, recorrência, integração com Tarefas e alteração de horários por arrastar e soltar. O Google Agenda é a referência de organização visual, não uma conexão externa nesta entrega.
