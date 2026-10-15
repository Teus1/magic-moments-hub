# QR Code Pix na aba Pagamentos da equipe

## O que você vai poder fazer

Na lista **Colaboradores › Pagamentos da equipe**, ao lado da chave Pix de cada linha, aparecerá um ícone. Ao clicar, abre uma janela com:

- o **QR Code Pix** já com o valor a pagar preenchido (quem escaneia só confirma);
- o **código "copia e cola"** do Pix, para pagar colando no app do banco;
- um pequeno formulário **Registrar pagamento** (valor, data e método) que lança o pagamento ali mesmo, sem abrir o evento — a pendência some da lista na hora.

O ícone só aparece quando a linha tem chave Pix cadastrada e valor a pagar. Quando não houver pendência, não há QR.

**Importante:** sem um provedor de pagamento, o QR não avisa sozinho que o Pix caiu. Ele facilita o envio; o financeiro confirma no banco e registra o pagamento na janela.

## Como funciona

```text
Linha pendente:  Evento X · João · chave Pix · a pagar R$ 350,00
        |
        v  clique no ícone de QR
+--------------------------------------------+
|  Pagamento de João                          |
|  Evento X · 12/10                           |
|                                             |
|          [ QR Code Pix ]                    |
|          R$ 350,00                          |
|                                             |
|  Chave: joao@email.com   [Copiar código]    |
|                                             |
|  Valor [350,00]  Data [14/10/2026]          |
|  Método [Pix v]              [Registrar]    |
+--------------------------------------------+
```

## Passos

1. **Gerador do código Pix** (`src/lib/pix.ts`) — monta o "BR Code" oficial: normaliza a chave (CPF/CNPJ com máscara viram só números, telefone vira +55..., e-mail e chave aleatória ficam como estão), inclui valor, nome de quem recebe e um identificador do lançamento, e calcula o código de verificação final (CRC16). Testes unitários com o código exato gerado, a normalização de cada tipo de chave e a recusa de chave vazia ou valor zero.
2. **Janela do QR** — instala a biblioteca `qrcode.react` (versão compatível com React 19, sem dependências extras) e desenha o QR na janela, com o valor, a chave e o botão de copiar o "copia e cola".
3. **Lançar pagamento na hora** — cria o registro de pagamento do colaborador (valor, data, método e quem lançou), com verificação de permissão no servidor (só quem pode editar Eventos). A lista se atualiza sozinha após registrar.
4. **Ajuste necessário no formulário de eventos** — o campo "Pago" da equipe passa a mostrar o total já registrado e deixa de ser digitado lá: os pagamentos da equipe passam a ser lançados pela janela do QR, em Pagamentos da equipe. O "Combinado" continua sendo preenchido no evento.
5. **Preservar o que já existe** — os valores pagos até hoje (informados no formulário de eventos) viram lançamentos registrados, com data e método "Saldo anterior", para que nenhum histórico se perca e a conta continue batendo.
6. **Validação** — testes unitários, verificação de tipos e teste real na prévia: abrir a lista, gerar o QR de uma linha pendente, conferir o valor, copiar o código, registrar um pagamento e ver a linha mudar para quitada e os totais do topo se atualizarem.

## Detalhes técnicos

- **Nova tabela `collaborator_payments`** (espelho de `event_payments`): `event_collaborator_id`, `amount`, `paid_at`, `method` (enum `payment_method` já existente), `created_by`. GRANTs + RLS iguais aos de `event_payments` (select com `events.view`, insert com `events.edit`).
- **`event_collaborators.paid_value` passa a ser derivado**: trigger `AFTER INSERT/UPDATE/DELETE` recalcula `paid_value = SUM(collaborator_payments.amount)` do vínculo — mesmo padrão de `sync_event_received_value` sobre `events.received_value`.
- **Backfill na mesma migração, antes do trigger**: `INSERT INTO collaborator_payments SELECT ... FROM event_collaborators WHERE paid_value > 0`, com `method = 'previous_balance'` e data de `created_at`, para que a primeira execução do trigger não zere saldos já pagos.
- **Payload EMV** (BR Code estático): `00=01`, `01=12` (estático), `26` com `br.gov.bcb.pix` + chave, `52=0000`, `53=986`, `54` com o valor em 2 decimais, `58=BR`, `59` = nome do colaborador (maiúsculas, sem acentos, 25 posições), `60=BRASIL`, `62(05)` = identificador curto do vínculo, `63` = CRC16-CCITT (polinômio 0x1021, init 0xFFFF) sobre o payload até "6304".
- **Permissões**: leitura da lista segue `events.view` (como hoje); o botão Registrar só aparece com `events.edit` e é verificado no servidor via `can('events','edit')` dentro do `createServerFn` com `requireSupabaseAuth`.
- **Sem provedor de pagamento**: QR estático gerado localmente, nenhum custo, nenhuma chave externa.
