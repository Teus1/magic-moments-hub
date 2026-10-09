import { z } from 'zod';
export const CALENDAR_ZONE = 'America/Sao_Paulo';
export function calendarToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CALENDAR_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
const wallTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).refine((v) => {
  const d = new Date(`${v}:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,16) === v;
}, 'Informe uma data e horário válidos.');
export const appointmentSchema = z.object({
  event_id: z.string().uuid('Selecione um evento.'),
  title: z.string().trim().min(1, 'Informe o título.').max(200),
  start_at: wallTime,
  end_at: wallTime,
  venue: z.string().trim().max(1000),
  observations: z.string().trim().max(40000),
}).refine((v) => v.end_at > v.start_at, { message: 'O término deve ser posterior ao início.', path: ['end_at'] });
export type AppointmentDraft = z.infer<typeof appointmentSchema>;
export interface CalendarEvent {
  id: string; name: string; event_date: string; start_time: string | null; end_time: string | null;
  venue: string | null; status: 'planned' | 'cancelled'; has_guestbook: boolean;
  client: { full_name: string } | null; service: { name: string; color: string } | null;
}
export interface CalendarAppointment {
  id: string; event_id: string; title: string; start_at: string; end_at: string; venue: string; observations: string;
  event: { id: string; name: string; status: 'planned' | 'cancelled' } | null;
}
export function eventInterval(event: Pick<CalendarEvent, 'event_date' | 'start_time' | 'end_time'>) {
  if (!event.start_time) return { start: event.event_date, end: addCalendarDays(event.event_date, 1), allDay: true };
  const start = `${event.event_date}T${event.start_time}`;
  const end = event.end_time ? `${event.end_time <= event.start_time ? addCalendarDays(event.event_date, 1) : event.event_date}T${event.end_time}` : undefined;
  return { start, ...(end ? { end } : {}), allDay: false };
}
export function appointmentPermissions(can: (module: 'calendar' | 'events', action: 'view' | 'create' | 'edit' | 'delete') => boolean) {
  const read = can('calendar', 'view') && can('events', 'view');
  return { read, create: read && can('events','create'), edit: read && can('events','edit'), delete: read && can('events','delete') };
}
