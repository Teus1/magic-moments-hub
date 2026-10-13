# Eventos sem Atração, Ficha sem Atrações e Deslocamento por evento

## 1. Remover campos da tela de Eventos
- Tirar "Atração" e "Onde a atração deve começar" do formulário e dos detalhes de Eventos. A atração já vem do Serviço escolhido.
- Os dados antigos continuam guardados (não são apagados), só deixam de aparecer.

## 2. Remover "Atrações" de Configurações > Ficha de contrato
- A página fica apenas com "Avisos de WhatsApp" e com a nova seção de Deslocamento (item 3).
- Revisão da ficha no painel de Clientes deixa de mostrar a atração antiga.

## 3. Deslocamento ligado aos eventos
**Configuração (Ficha de contrato > Deslocamento padrão):**
- Endereço fixo da empresa (com sugestões do Google Maps).
- Consumo padrão (km/L) e preço padrão do combustível (R$/L).

**Na aba Deslocamento, nova lista "Próximos eventos":**
- Todos os eventos planejados a partir de hoje, ordenados por data.
- Cada linha: data/hora, evento, cliente, local, colaboradores escalados, distância ida e volta, combustível, pedágios e total estimado.
- O valor é calculado automaticamente (empresa -> local do evento -> empresa) e guardado; recalcula quando o endereço do evento ou o endereço padrão mudam.
- Botão "Recalcular" por evento e ajuste de pedágio manual quando o Google não informar o preço.
- Botão "Abrir no simulador" leva o evento para a calculadora atual já preenchida.
- Eventos sem local cadastrado aparecem com aviso "Local não informado".

A calculadora atual continua disponível abaixo da lista.

## Detalhes técnicos
- Nova tabela de configuração única (endereço base, km/L, R$/L) com permissões de settings; nova tabela `event_travel_estimates` (event_id único, distância, duração, pedágio ida/volta, pedágio manual, origem/destino usados, calculado_em) com RLS de Eventos.
- Server function autenticada (permissão events:view) que calcula estimativas pendentes/desatualizadas reutilizando a consulta de rotas existente, com limite por chamada para controlar custo do Google.
- Remoção de campos apenas na interface; colunas `attraction_id`/`attraction_start_location` e tabela `attractions` marcadas como obsoletas, sem exclusão.
- Testes para o cálculo do total (ida e volta + pedágio manual prevalece).
