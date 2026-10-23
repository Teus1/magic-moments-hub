# Eventos: status simplificado e remoção de responsável

## O que muda

**Status com apenas 2 opções manuais**

- O usuário escolhe apenas **Planejado** ou **Cancelado**.
- **Realizado** deixa de ser uma opção: passa a ser calculado automaticamente — se o evento está Planejado e a data do evento já passou (anterior a hoje), o sistema exibe "Realizado".
- Eventos Cancelados continuam Cancelados, independente da data.
- O filtro da listagem passa a ter: Todos, Planejado, Realizado, Cancelado (o filtro "Realizado" mostra os planejados com data passada).
- Indicadores do topo continuam ignorando cancelados.

**Responsável removido**

- Campo "Responsável" sai do formulário e da listagem de eventos.
- No lugar dele, mais adiante, entra o cadastro de **Colaboradores/Operadores** (equipe que trabalha no dia do evento), com vínculo manual por evento — isso fica para uma etapa futura, quando você pedir.

## Detalhes técnicos

- Migração no banco:
  - novo tipo de status com os valores `planned` e `cancelled`; dados existentes convertidos (`lead`/`confirmed`/`done` → `planned`, `cancelled` mantido), default `planned`.
  - remover a coluna `responsible_id` da tabela de eventos (com a chave estrangeira correspondente).
- `src/lib/events.ts`: `EventStatus` passa a ser `"planned" | "cancelled"`; adicionar tipo derivado `EventDisplayStatus` (`planned` | `done` | `cancelled`) e função `resolveEventStatus(status, event_date)`; atualizar labels/cores; remover `responsible_id` do formulário.
- `src/routes/_authenticated/eventos.tsx`: remover seleção e exibição de responsável (e a busca por nome do responsável), usar o status derivado no badge e no filtro, e limitar o select de status a Planejado/Cancelado.
