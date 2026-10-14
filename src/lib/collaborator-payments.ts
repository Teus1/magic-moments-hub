export function collaboratorBalance(agreed: number, paid: number): number {
  return Math.max(0, Math.round((Number(agreed) - Number(paid)) * 100) / 100);
}

export function collaboratorPaymentTotals(rows: { agreed_value: number; paid_value: number }[]) {
  return rows.reduce((total, row) => ({
    agreed: Math.round((total.agreed + Number(row.agreed_value)) * 100) / 100,
    paid: Math.round((total.paid + Number(row.paid_value)) * 100) / 100,
    pending: Math.round((total.pending + collaboratorBalance(row.agreed_value, row.paid_value)) * 100) / 100,
  }), { agreed: 0, paid: 0, pending: 0 });
}