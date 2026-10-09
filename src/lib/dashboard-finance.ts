export interface FinancialEvent {
  event_date: string;
  status: string;
  contracted_value: number;
  received_value: number;
}

export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: string, offset: number) {
  const [year = 0, index = 1] = month.split("-").map(Number);
  return currentMonth(new Date(year, index - 1 + offset, 1));
}

export function monthBounds(month: string) {
  const [year = 0, index = 1] = month.split("-").map(Number);
  return { start: `${month}-01`, end: `${month}-${new Date(year, index, 0).getDate()}` };
}

export function annualFinance(events: FinancialEvent[], year: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const relevant = events.filter(event => event.status !== "cancelled" && event.event_date.startsWith(month));
    const contracted = relevant.reduce((sum, event) => sum + Number(event.contracted_value || 0), 0);
    const received = relevant.reduce((sum, event) => sum + Number(event.received_value || 0), 0);
    return { month, label: new Date(year, index, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), contracted, received, balance: contracted - received };
  });
}