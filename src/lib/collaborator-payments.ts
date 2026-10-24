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

/** Saldo total (serviço + deslocamento) */
export function collaboratorBalance(agreed: number, paid: number): number {
  return Math.max(0, Math.round((Number(agreed) - Number(paid)) * 100) / 100);
}

/** Saldo apenas do serviço */
export function collaboratorServiceBalance(agreed: number, servicePaid: number): number {
  return Math.max(0, Math.round((Number(agreed) - Number(servicePaid)) * 100) / 100);
}

/** Saldo apenas do deslocamento */
export function collaboratorTransportBalance(transportAgreed: number, transportPaid: number): number {
  return Math.max(0, Math.round((Number(transportAgreed) - Number(transportPaid)) * 100) / 100);
}

export interface CollaboratorPaymentTotals {
  agreed: number;
  paid: number;
  pending: number;
  serviceAgreed: number;
  servicePaid: number;
  servicePending: number;
  transportAgreed: number;
  transportPaid: number;
  transportPending: number;
}

export function collaboratorPaymentTotals(rows: {
  agreed_value: number;
  paid_value: number;
  service_paid_value: number;
  transport_paid_value: number;
  is_transport_responsible: boolean;
  transport_value: number | null;
}[]): CollaboratorPaymentTotals {
  return rows.reduce(
    (total, row) => {
      const agreed = Number(row.agreed_value);
      // Usa a soma dos campos separados (mais confiável que paid_value que pode não estar sincronizado)
      const servicePaid = Number(row.service_paid_value ?? 0);
      const transportPaid = Number(row.transport_paid_value ?? 0);
      const paid = servicePaid + transportPaid;
      const transportAgreed = row.is_transport_responsible ? Number(row.transport_value ?? 0) : 0;
      const serviceAgreed = agreed - transportAgreed;

      return {
        agreed: Math.round((total.agreed + agreed) * 100) / 100,
        paid: Math.round((total.paid + paid) * 100) / 100,
        pending: Math.round((total.pending + collaboratorBalance(agreed, paid)) * 100) / 100,
        serviceAgreed: Math.round((total.serviceAgreed + serviceAgreed) * 100) / 100,
        servicePaid: Math.round((total.servicePaid + servicePaid) * 100) / 100,
        servicePending: Math.round((total.servicePending + collaboratorServiceBalance(serviceAgreed, servicePaid)) * 100) / 100,
        transportAgreed: Math.round((total.transportAgreed + transportAgreed) * 100) / 100,
        transportPaid: Math.round((total.transportPaid + transportPaid) * 100) / 100,
        transportPending: Math.round((total.transportPending + collaboratorTransportBalance(transportAgreed, transportPaid)) * 100) / 100,
      };
    },
    {
      agreed: 0, paid: 0, pending: 0,
      serviceAgreed: 0, servicePaid: 0, servicePending: 0,
      transportAgreed: 0, transportPaid: 0, transportPending: 0,
    },
  );
}
