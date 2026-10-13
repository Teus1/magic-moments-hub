# Ficha de contrato do cliente (substitui o pré-cadastro simples)

## O que muda para a equipe

1. **Novo link "Ficha de contrato"** (em Clientes): a equipe gera um link individual e envia ao cliente. O link vale por um tempo limitado e só aceita um envio.
2. **Formulário do cliente**, em duas partes:
   - **Dados pessoais**: os mesmos campos da tela de Clientes (nome, CPF, RG, nascimento, WhatsApp, e-mail, endereço completo com CEP).
   - **Dados do evento**: nome/título, tipo, data, horário de início da atração, duração, local do evento com busca do Google Maps, local previsto para a atração começar (ex.: salão, jardim), cerimonialista (sim/não, nome e contato, se o contato deve ser feito pelo cerimonialista), livro de assinaturas (sim/não), atração escolhida e observações.
   - Termo de consentimento e uma tela de confirmação no final.
3. **"Pré-aprovado" na aba Clientes**: as fichas recebidas aparecem em destaque no topo da aba Clientes com o selo "Pré-aprovado", já separadas dos clientes validados.
4. **Validação**: a pessoa responsável abre a ficha, confere e corrige os dados pessoais e então confirma. O cliente passa a ser cadastrado de verdade (ou é vinculado a um cadastro que já existe, se o CPF, WhatsApp ou e-mail já constarem no sistema). Nada é sobrescrito sem que a pessoa escolha.
5. **Evento depois**: após validar, o botão "Cadastrar evento" abre a tela de novo evento já preenchida com os dados da ficha. A pessoa revisa, completa os valores e salva. A ficha fica guardada para consulta.
6. **Lista de atrações**: nova lista em Configurações > Atrações (nome, descrição, ativo/inativo), separada de Serviços. O cliente só vê as atrações ativas. A atração escolhida aparece na ficha e no evento.
7. **WhatsApp para aviso**: nova tela em Configurações > Avisos de WhatsApp, onde vocês cadastram, editam, ativam ou desativam vários números. Por enquanto **nenhuma mensagem é enviada sozinha**, porque ainda falta escolher o serviço de envio. Até lá, cada ficha nova ganha um selo "Nova" em Clientes e um botão "Avisar no WhatsApp", que abre a conversa com a mensagem pronta. Quando vocês escolherem o serviço, o envio automático é ligado para todos os números ativos.

## Fora deste passo
- O envio automático de WhatsApp fica para depois, quando vocês escolherem o serviço de envio.
- A ficha não cria o evento sozinha nem mexe nos valores financeiros.
- Os links de pré-cadastro já enviados continuam funcionando e passam a abrir a ficha nova.

## Detalhes técnicos
- Migração aditiva: tabela `attractions` (nome, descrição, status, ordem) e tabela `whatsapp_notification_recipients` (nome, número, ativo), com GRANTs, RLS e permissões no catálogo (módulos `attractions` e `notifications`, todas as ações para Administrador). Em `events`, as colunas anuláveis `attraction_id`, `attraction_start_location` e `has_ceremonial` (já existe), além de `client_preregistrations.notified_at`.
- O payload da ficha ganha um bloco `event` validado em zod e em `submit_client_preregistration` (limites de tamanho, booleanos, data, duração entre 1 e 1439, atração ativa existente). A leitura pública das atrações ativas passa por uma função de servidor sem dados pessoais, só com o token válido.
- O fluxo pré-aprovado reutiliza `review_client_preregistration`, com a edição dos campos antes da confirmação. O evento pré-preenchido usa o `preregistration_id` e a navegação já existentes para a tela de Eventos.
- O endereço do local usa a busca do Google Maps também na página pública, por uma função de servidor limitada pelo token (com limite de chamadas) e preenchimento manual se a busca falhar.
- O botão de aviso usa `wa.me` com a mensagem codificada. O envio automático fica preparado como ponto de extensão no servidor, depois da gravação.
- Testes: validação do payload do evento e montagem da mensagem de aviso. Teste completo de ponta a ponta do envio público; a revisão interna depende de login na prévia.
