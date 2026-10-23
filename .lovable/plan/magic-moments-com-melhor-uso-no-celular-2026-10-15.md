# Magic Moments com melhor uso no celular

## Objetivo

Adaptar toda a aplicação para uso confortável no celular, priorizando **Eventos, Clientes, Calendário e Deslocamento**, sem alterar dados, cálculos, permissões ou funções existentes. Preservar a identidade roxa, amarela e branca e as fontes atuais.

## Situação verificada

- As quatro telas prioritárias abrem em uma largura de 390 px sem ultrapassar a largura da página, mas isso não garante conforto nas tabelas e nos formulários.
- Em Eventos, os indicadores e filtros ocupam quase toda a primeira tela, deixando a lista mais abaixo.
- Em Clientes, as ações das fichas de contrato mudam de posição conforme o tamanho do nome.
- O calendário mensal usa altura fixa de 680 px e nomes abreviados pelo pouco espaço nas células.
- A lista de deslocamentos usa uma tabela com largura mínima de 900 px, exigindo rolagem lateral no celular.

## 1. Base comum

- Ajustar cabeçalhos, espaçamentos e alinhamentos para aproveitar melhor a tela sem deixar tudo apertado.
- Organizar título e ação principal de forma previsível, com nomes longos sem sobreposição.
- Facilitar o toque em menu, setas, filtros, ícones e ações; manter identificação acessível dos ícones.
- Adaptar janelas de cadastro e edição à altura disponível, com conteúdo rolável, fechamento acessível e ações de salvar/cancelar fáceis de alcançar.
- Conferir teclado aberto, campos numéricos, listas de opções e sugestões de endereço; não bloquear o zoom do navegador.

## 2. Prioridade: Eventos e Clientes

- Compactar o resumo e organizar busca, filtros, contador e o único controle de ocultar valores em Eventos.
- Usar listas próprias para celular, com informações agrupadas por registro e ações acessíveis; manter tabelas no computador.
- Preservar acesso a todas as informações, inclusive valores, status, equipe e detalhes, sem simplesmente esconder colunas importantes.
- Reorganizar os formulários longos em seções claras, mantendo todos os campos e as mesmas validações.
- Padronizar nome, status e ações nas fichas de contrato, incluindo geração do link e revisão.
- Conferir também a ficha pública preenchida pelo cliente no celular.

## 3. Prioridade: Calendário e Deslocamento

- Organizar as setas, período, Hoje e alternância Mês/Dia em posições estáveis.
- Ajustar a altura do calendário à tela e melhorar a leitura dos itens; preservar a seleção do dia, os horários completos de 00h a 24h e os compromissos vinculados aos eventos.
- Facilitar a abertura dos detalhes e o cadastro de compromissos por toque, inclusive em dias com vários itens.
- Manter o simulador acima e a lista mensal de eventos abaixo em Deslocamento.
- No celular, apresentar cada deslocamento com data, evento, local, equipe, distância, combustível, pedágios e total juntos, sem depender de uma tabela larga.
- Preservar as ações de simular, recalcular e informar pedágio manual, assim como todos os cálculos atuais.
- Ajustar sugestões de endereço, resultados e mapa à largura disponível.

## 4. Demais telas

- Aplicar a mesma revisão a Dashboard, Colaboradores/Pagamentos da equipe, Minha agenda, Tarefas, Serviços e Configurações.
- Garantir leitura dos valores e uso do QR Code Pix no celular.
- Ajustar gráfico, seletores de mês, abas, paginação e listas densas sem perder informações.
- Em Tarefas, preservar os comandos explícitos de concluir/reabrir e evitar que o gesto de arrastar atrapalhe a rolagem.

## Detalhes técnicos

- Mudanças limitadas à apresentação e interação: sem migração do banco, alteração das consultas financeiras ou ampliação de permissões.
- Reutilizar os controles e tokens existentes; aplicar correções compartilhadas onde forem seguras e ajustes específicos onde as telas exigirem.
- Manter as mesmas fontes de dados e ações para as apresentações de celular e computador, evitando divergências de cálculos ou registros.
- Usar medidas compatíveis com a altura móvel disponível e respeitar áreas seguras e preferência por movimento reduzido.

## Validação

- Conferir larguras de 320, 390 e 430 px, além de tablet e computador, e orientação horizontal nas telas prioritárias.
- Testar com acesso autenticado e registros reais, sem alterar registros existentes apenas para demonstração.
- Verificar navegação, busca, filtros, paginação, abertura de detalhes e formulários de Eventos/Clientes.
- Conferir calendário mensal e diário, compromissos, lista mensal de deslocamentos e abertura do simulador.
- Conferir nomes e endereços longos, estados vazios, carregamento e erro; nenhuma informação ou ação deve ficar cortada.
- Executar os testes existentes pertinentes e verificar ausência de falhas na aplicação.

## Fora do escopo

Não criar aplicativo separado, não mudar regras de negócio e não publicar automaticamente. A publicação no domínio será uma etapa posterior à revisão na prévia.
