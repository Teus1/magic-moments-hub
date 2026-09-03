/**
 * Catálogo de permissões (espelha a tabela `permissions` no banco).
 * Para adicionar um novo módulo no futuro: insira as permissões no banco
 * e adicione o módulo aqui — nenhuma outra parte do sistema precisa mudar.
 */

export type ModuleKey =
  | "dashboard"
  | "clients"
  | "events"
  | "calendar"
  | "services"
  | "collaborators"
  | "users"
  | "roles"
  | "settings";

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
}

export const MODULES: ModuleDefinition[] = [
  { key: "dashboard", label: "Dashboard", description: "Painel e indicadores" },
  { key: "clients", label: "Clientes", description: "Cadastro de clientes" },
  { key: "events", label: "Eventos", description: "Eventos e valores" },
  { key: "calendar", label: "Calendário", description: "Agenda de eventos" },
  { key: "services", label: "Serviços", description: "Serviços oferecidos" },
  {
    key: "collaborators",
    label: "Colaboradores",
    description: "Operadores dos eventos",
  },
  { key: "users", label: "Usuários", description: "Equipe interna" },
  { key: "roles", label: "Roles e permissões", description: "Papéis de acesso" },
  { key: "settings", label: "Configurações", description: "Configurações do sistema" },
];

export const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  MODULES.map((m) => [m.key, m.label]),
);

/** Campos sensíveis já preparados para permissão por campo (etapa futura). */
export const FIELD_PERMISSION_CANDIDATES: Record<string, { field: string; label: string }[]> = {
  events: [
    { field: "contracted_value", label: "Valor contratado" },
    { field: "received_value", label: "Valor recebido" },
    { field: "status", label: "Status do evento" },
  ],
  clients: [
    { field: "phone", label: "Telefone" },
    { field: "email", label: "E-mail" },
  ],
};

export function permissionKey(module: string, action: string) {
  return `${module}.${action}`;
}

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

export const INTERNAL_EMAIL_DOMAIN = "magicmoments.local";

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}
