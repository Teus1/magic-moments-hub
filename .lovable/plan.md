# Concluir simplificação de status e remoção de responsável

## Estado atual

- Migração já aplicada no banco: `event_status` passou a ser apenas `planned`/`cancelled` (dados antigos convertidos para `planned`) e a coluna `responsible_id` foi removida da tabela `events`.
- O código ainda usa os valores antigos (`lead`, `confirmed`, `done`) e o campo `responsible_id`, o que quebra tipagem e runtime.

## O que falta fazer

**`src/lib/events.ts`**
- `EventStatus` vira `"planned" | "cancelled"`.
- Novo tipo derivado `EventDisplayStatus = "planned" | "done" | "cancelled"` e função `resolveEventStatus(status, event_date)`: se `planned` e a data do evento for anterior a hoje → `done`.
- Labels/cores: Planejado (primária), Realizado (sucesso), Cancelado (destructive).
- Remover `responsible_id` de `EventForm` e `emptyEventForm`; status inicial `planned`.

**`src/routes/_authenticated/eventos.tsx`**
- Remover `responsible_id`/`responsible` da interface, do SELECT, do payload, do formulário e da listagem; remover a query `team`.
- Badge e filtro passam a usar o status derivado (`resolveEventStatus`).
- Filtro de status: Todos / Planejado / Realizado / Cancelado ("Realizado" = planejados com data passada).
- Select de status no formulário limitado a Planejado/Cancelado.
- Indicadores do topo continuam ignorando cancelados.

## Verificação

- Checagem de tipos (`tsgo`) e teste visual da listagem/formulário no preview.
