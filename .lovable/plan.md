# Dashboard financeiro com seleção de mês

## Objetivo
Simplificar o Dashboard para acompanhar os valores financeiros e os eventos de qualquer mês, mantendo a identidade visual Magic Moments.

## Alterações
- Abrir inicialmente no mês atual — outubro de 2026 neste momento — usando a data atual, sem fixar outubro permanentemente.
- Acrescentar um seletor de mês e ano com setas para anterior/próximo e uma opção de retornar ao mês atual. Permitir consultar períodos passados e futuros, inclusive de outros anos.
- Remover os indicadores Clientes cadastrados, Serviços ativos e Colaboradores ativos, além da faixa Operacional, deixando o resumo financeiro em destaque: **Valor contratado, Valor recebido e Saldo a receber**.
- Aplicar o mês selecionado aos três valores. Conforme sua escolha, contratado e recebido serão agrupados **pelo mês do evento**, não pela data de pagamento; o saldo continuará sendo contratado menos recebido, excluindo eventos cancelados.
- Inserir um gráfico de barras comparativas com duas séries: **Contratado** e **Recebido**, de janeiro a dezembro do ano selecionado. Destacar o mês escolhido, mostrar valores em reais ao consultar as barras e manter meses sem eventos com valor zero.
- Exibir uma lista compacta chamada **Eventos do mês**, acompanhando o período escolhido: data, horário, evento, cliente, serviço, status e acesso aos detalhes. Incluir eventos realizados nos meses anteriores e agendados nos futuros, com cancelados claramente identificados. Se houver muitos eventos, usar paginação em vez de ocultá-los.
- Substituir os resumos Realizados recentemente e Eventos por serviço pelo gráfico financeiro e pela lista mensal, concentrando o painel no pedido atual.
- Manter **um único botão Novo evento**, no canto superior direito, reutilizando o cadastro existente; remover sua repetição nos estados vazios.

## Apresentação
- Faixas compactas, separadores discretos e gráfico sem caixas decorativas ou sombras extras.
- Preservar a barra lateral roxa, a marca e as cores já utilizadas.
- Mostrar carregamento, falha com opção de tentar novamente e períodos sem eventos sem inventar dados.
- Adaptar o seletor, os valores, o gráfico e a lista para computador, tablet e celular.

## Detalhes técnicos
- A página atual consulta apenas o mês corrente para o resumo, enquanto as listas de próximos e recentes têm consultas independentes; substituir essa organização por consultas vinculadas ao período selecionado.
- Usar os campos existentes dos eventos para os totais mensais e anuais, com leitura paginada para não truncar os resultados.
- Reutilizar os recursos de gráficos já disponíveis no projeto e os tokens de cores existentes.
- Preservar autenticação, permissões, registros de pagamentos, cálculos de saldo, cadastro de eventos e demais módulos; nenhuma alteração de estrutura do banco é necessária.

## Validação
- Testar mudança de mês, virada de ano e retorno ao mês atual.
- Conferir totais e gráfico com eventos em meses diferentes, parcelas recebidas, cancelados e meses vazios.
- Confirmar que o recebido pertence ao mês do evento mesmo quando os pagamentos ocorreram em outra data.
- Conferir paginação, detalhes, botão único de Novo evento e acesso conforme as permissões existentes.
- Verificar a apresentação em computador, tablet e celular.
