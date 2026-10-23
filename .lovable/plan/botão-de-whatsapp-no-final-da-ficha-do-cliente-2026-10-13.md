# Botão de WhatsApp no final da ficha do cliente

## O que muda para o cliente

- Depois que o cliente clica em enviar e a ficha é salva, a tela de confirmação mostra o botão **"Enviar minhas informações pelo WhatsApp"**.
- O botão abre o WhatsApp com uma mensagem pronta, com tudo o que ele preencheu: nome, CPF, contatos, endereço, título do evento, data, horário, duração, local e endereço, atração escolhida, cerimonialista (nome/contato), GuestBook e observações.
- A mensagem vai para o número cadastrado em **Configurações > Ficha de contrato > Avisos de WhatsApp**. Se houver mais de um número ativo, aparece um botão para cada (com o nome cadastrado), já que o WhatsApp só abre uma conversa por vez.
- Se nenhum número estiver ativo, o botão não aparece e a ficha continua sendo salva normalmente.

## O que continua igual

- A ficha continua chegando em Clientes como pré-aprovada para a equipe validar.
- O botão de aviso da equipe no painel interno continua disponível como reserva.

## Detalhes técnicos

- Nova função pública em `client-intake.functions.ts`, liberada só com token válido (pendente ou recém-enviado, não excluído), que devolve apenas nome e telefone dos destinatários ativos de `whatsapp_notification_recipients`; nenhum dado de cliente é lido publicamente.
- A mensagem é montada no navegador a partir dos dados que o próprio cliente acabou de digitar (helper testado em `client-intake.ts`, com nome da atração resolvido pela lista já carregada), codificada em link `wa.me/55<numero>?text=...`.
- Teste unitário do texto gerado (campos presentes, telefone normalizado com 55).
- Validação com Playwright na prévia: preencher ficha de teste, conferir o link do botão, apagar a ficha de teste. Precisa publicar para valer no domínio próprio.
