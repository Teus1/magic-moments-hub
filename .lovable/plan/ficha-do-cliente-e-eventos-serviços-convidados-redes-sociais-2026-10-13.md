# Ficha do cliente e Eventos: serviços, convidados, redes sociais e origem

## O que muda

1. **Atração = Serviços cadastrados**: na ficha do cliente, a lista "Atração escolhida" passa a mostrar os Serviços ativos do sistema (os mesmos de Configurações > Serviços). Ao cadastrar o evento a partir da ficha, o serviço escolhido já vem preenchido no campo Serviço do evento. A lista separada de Atrações deixa de ser usada na ficha (registros antigos são mantidos).
2. **Quantidade aproximada de convidados**: campo numérico na ficha e no formulário de Eventos.
3. **Redes sociais**: pergunta de Sim/Não, com o texto exato: "Podemos compartilhar alguns registros do seu evento em nossas redes sociais para mostrar um pouco da experiência Magic Moments? As publicações são feitas sempre com respeito aos nossos clientes e ao momento vivido." Se a resposta for "Sim", abre um campo para informar os @ do Instagram (um ou mais, ex.: @noiva, @noivo). Na ficha e em Eventos.
4. **Como nos conheceu?**: opções Instagram/Facebook, Indicação, Evento de conhecido, Site Casamentos.com.br e Outro. Ao escolher "Outro", aparece um campo para o cliente escrever. Na ficha e em Eventos.
5. Os novos dados aparecem também na revisão interna da ficha, no pré-preenchimento do evento e na mensagem enviada pelo WhatsApp.

## Detalhes técnicos

- Migração aditiva em `events`: `guest_count integer` (1–100000, nulo), `social_media_consent boolean` (nulo = não respondido), `instagram_handles text` (até 300, limpo quando a resposta não é "Sim"), `referral_source text` (instagram_facebook, indicacao, evento_conhecido, casamentos_com_br, outro), `referral_other text` (até 150, obrigatório só se "outro"), validados no gatilho existente de eventos.
- `submit_client_preregistration` passa a aceitar e validar `service_id` (serviço ativo), `guest_count`, `social_media_consent`, `referral_source`, `referral_other` no bloco do evento; `attraction_id` continua aceito para fichas antigas.
- Nova função pública com token (`publicServices`) substitui `publicAttractions` na ficha, devolvendo só id e nome dos serviços ativos.
- `intakeEventSchema`, `emptyIntakeEvent`, `intakeSummaryMessage`, formulário de eventos (`eventos.tsx`/`events.functions.ts`) e painel de revisão atualizados; fichas antigas com `attraction_id` continuam exibindo o nome da atração.
- Testes: regra de "Outro" exigir texto, faixa de convidados e mensagem com os novos campos. Validação com Playwright na ficha e em Eventos.
