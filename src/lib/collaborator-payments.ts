/** Métodos que o financeiro pode escolher ao lançar um pagamento da equipe. */
export const COLLABORATOR_PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "credit", label: "Crédito" },
  { value: "debit", label: "Débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "transfer", label: "Transferência" },
] as const;

export type CollaboratorPaymentMethod = (typeof COLLABORATOR_PAYMENT_METHODS)[number]["value"];

export function collaboratorBalance(agreed: number, paid: number): number {
  return Math.max(0, Math.round((Number(agreed) - Number(paid)) * 100) / 100);
}

export function collaboratorPaymentTotals(rows: { agreed_value: number; paid_value: number }[]) {
  return rows.reduce(
    (total, row) => ({
      agreed: Math.round((total.agreed + Number(row.agreed_value)) * 100) / 100,
      paid: Math.round((total.paid + Number(row.paid_value)) * 100) / 100,
      pending:
        Math.round((total.pending + collaboratorBalance(row.agreed_value, row.paid_value)) * 100) /
        100,
    }),
    { agreed: 0, paid: 0, pending: 0 },
  );
}
