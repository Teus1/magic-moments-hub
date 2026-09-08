# Etapa final: Dashboard e indicadores

## O que já está pronto

Login, Usuários, Roles e permissões, Clientes, Serviços, Eventos, Colaboradores e Calendário.

## O que falta

O Dashboard ainda é uma tela provisória, com cartões explicativos "serão liberados nas próximas etapas". Ele passa a mostrar números reais:

**Indicadores do mês atual**
- Eventos no mês (planejados/realizados, cancelados fora da conta)
- Valor contratado no mês
- Valor recebido no mês
- Saldo a receber no mês

**Blocos de apoio**
- Próximos eventos (até 5): data, nome, cliente, local e horário, com link para Eventos
- Eventos realizados recentemente (últimos 5 com data passada)
- Totais gerais: clientes cadastrados, serviços ativos, colaboradores ativos
- Distribuição por serviço no mês (nome + cor do serviço + quantidade)

**Regras**
- Cada bloco só aparece se o usuário tiver a permissão do módulo correspondente (eventos, clientes, serviços, colaboradores).
- Valores em reais no formato pt-BR; status usa o cálculo automático de "Realizado".
- Visual segue a identidade Magic Moments (roxo #6335A7, detalhes em #F8C419, fundo branco) e o estilo glass já usado nas outras telas.

## Detalhes técnicos

- Reescrever `src/routes/_authenticated/dashboard.tsx` com consultas via TanStack Query ao Supabase: `events` (com join de cliente e serviço), contagens de `clients`, `services` e `collaborators`.
- Reutilizar `formatCurrency`, `formatEventDate`, `formatTimeRange`, `resolveEventStatus` e os tokens de status de `src/lib/events.ts`.
- Nenhuma mudança de banco necessária.

## Verificação

Checagem de tipos e conferência visual do dashboard no preview.
