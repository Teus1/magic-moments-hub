import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assertCan } from '@/lib/admin.server';
import { addCalendarDays, appointmentSchema, type CalendarEvent, type CalendarAppointment } from '@/lib/calendar';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const loadCalendar = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
 .inputValidator((v: unknown) => z.object({ start: date, end: date }).refine(v => v.end > v.start && v.end <= addCalendarDays(v.start, 62), 'Período inválido.').parse(v))
 .handler(async ({ data, context }) => {
  await assertCan(context.supabase, 'calendar', 'view');
  const events: CalendarEvent[] = [];
  const appointments: CalendarAppointment[] = [];
  for (let offset = 0; ; offset += 500) {
   const response = await context.supabase.from('events').select('id,name,event_date,start_time,end_time,venue,status,has_guestbook,client:clients(full_name),service:services(name,color)').gte('event_date',addCalendarDays(data.start,-1)).lt('event_date',data.end).order('id').range(offset,offset+499);
   if(response.error) throw new Error('Não foi possível carregar os eventos.');
   events.push(...(response.data as CalendarEvent[]));
   if(response.data.length < 500) break;
  }
  const permission = await context.supabase.rpc('can', { _module: 'events', _action: 'view' });
  if(permission.data) for (let offset = 0; ; offset += 500) {
   const response = await context.supabase.from('calendar_appointments').select('id,event_id,title,start_at,end_at,venue,observations,event:events(id,name,status)').lt('start_at',`${data.end}T00:00:00`).gt('end_at',`${data.start}T00:00:00`).order('id').range(offset,offset+499);
   if(response.error) throw new Error('Não foi possível carregar os compromissos.');
   appointments.push(...(response.data as CalendarAppointment[]));
   if(response.data.length < 500) break;
  }
  return { events, appointments };
 });
export const calendarEventOptions = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
 .handler(async ({ context }) => {
  await assertCan(context.supabase,'calendar','view');
  await assertCan(context.supabase,'events','view');
  const items: { id: string; name: string; event_date: string; status: 'planned' | 'cancelled' }[] = [];
  for (let offset = 0; ; offset += 500) {
   const response = await context.supabase.from('events').select('id,name,event_date,status').order('event_date',{ascending:false}).order('id').range(offset,offset+499);
   if(response.error) throw new Error('Não foi possível carregar os eventos disponíveis.');
   items.push(...response.data);
   if(response.data.length < 500) break;
  }
  return items;
 });
export const saveCalendarAppointment = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
 .inputValidator((v: unknown) => z.object({ id: z.string().uuid().nullable(), draft: appointmentSchema }).parse(v))
 .handler(async ({ data, context }) => {
  await assertCan(context.supabase,'calendar','view');
  await assertCan(context.supabase,'events','view');
  await assertCan(context.supabase,'events',data.id ? 'edit' : 'create');
  const event = await context.supabase.from('events').select('id').eq('id',data.draft.event_id).single();
  if(event.error || !event.data) throw new Error('O evento selecionado não está disponível.');
  const response = data.id
   ? await context.supabase.from('calendar_appointments').update(data.draft).eq('id',data.id).select('id').single()
   : await context.supabase.from('calendar_appointments').insert({...data.draft,created_by:context.userId}).select('id').single();
  if(response.error) throw new Error('Não foi possível salvar o compromisso. Verifique suas permissões e tente novamente.');
  return response.data;
 });
export const deleteCalendarAppointment = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
 .inputValidator((v: unknown) => z.object({id:z.string().uuid()}).parse(v))
 .handler(async ({ data, context }) => {
  await assertCan(context.supabase,'calendar','view');
  await assertCan(context.supabase,'events','view');
  await assertCan(context.supabase,'events','delete');
  const response = await context.supabase.from('calendar_appointments').delete().eq('id',data.id).select('id').single();
  if(response.error) throw new Error('Não foi possível excluir o compromisso.');
  return response.data;
 });
