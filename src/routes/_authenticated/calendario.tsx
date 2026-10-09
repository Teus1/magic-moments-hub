import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { lazy, Suspense, useMemo, useState } from 'react';
import { BookHeart, Clock, MapPin, Plus } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarAppointmentDialog } from '@/components/calendar-appointment-dialog';
import { useCurrentUser } from '@/hooks/use-current-user';
import { loadCalendar } from '@/lib/calendar.functions';
import { calendarToday, addCalendarDays, eventInterval, appointmentPermissions, type CalendarEvent, type CalendarAppointment } from '@/lib/calendar';
import { EVENT_DISPLAY_STATUS_CLASSES, EVENT_DISPLAY_STATUS_LABELS, formatTimeRange, resolveEventStatus } from '@/lib/events';
import { cn } from '@/lib/utils';
const OperationalCalendar = lazy(() => import('@/components/operational-calendar'));
export const Route = createFileRoute('/_authenticated/calendario')({
 head: () => ({meta:[{title:'Calendário — Magic Moments'},{name:'description',content:'Agenda mensal e diária de eventos, montagens e compromissos operacionais da Magic Moments.'},{property:'og:title',content:'Calendário — Magic Moments'},{property:'og:description',content:'Eventos e compromissos operacionais organizados por dia e horário.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex'}]}),
 component: CalendarPage,
});
function CalendarPage() {
 const { can } = useCurrentUser();
 const permissions = appointmentPermissions(can);
 const fetchCalendar = useServerFn(loadCalendar);
 const [range,setRange] = useState(() => ({start:calendarToday(),end:addCalendarDays(calendarToday(),1)}));
 const [event,setEvent] = useState<CalendarEvent | null>(null);
 const [editor,setEditor] = useState<{appointment:CalendarAppointment | null;start:string} | null>(null);
 const query = useQuery({queryKey:['operational-calendar',range.start,range.end],queryFn:() => fetchCalendar({data:range}),enabled:can('calendar','view')});
 const items = useMemo(() => [
  ...(query.data?.events ?? []).map(e => ({id:`event:${e.id}`,title:e.name,...eventInterval(e),classNames:['calendar-commercial',...(e.status === 'cancelled' ? ['calendar-cancelled'] : [])],extendedProps:{detail:e.venue ?? e.client?.full_name ?? ''}})),
  ...(query.data?.appointments ?? []).map(a => ({id:`appointment:${a.id}`,title:a.title,start:a.start_at,end:a.end_at,classNames:['calendar-operational',...(a.event?.status === 'cancelled' ? ['calendar-cancelled'] : [])],extendedProps:{detail:a.event?.name ?? ''}})),
 ],[query.data]);
 function openItem(id: string) {
  if(id.startsWith('event:')) setEvent(query.data?.events.find(e => e.id === id.slice(6)) ?? null);
  else {const appointment = query.data?.appointments.find(a => a.id === id.slice(12));if(appointment) setEditor({appointment,start:appointment.start_at.slice(0,16)});}
 }
 if(!can('calendar','view')) return <AppShell><PageHeader title="Calendário" description="Você não tem permissão para visualizar este módulo."/></AppShell>;
 return <AppShell>
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><PageHeader title="Calendário" description="Agenda operacional"/>{permissions.create && <Button onClick={() => setEditor({appointment:null,start:`${range.start}T09:00`})}><Plus className="size-4"/>Novo compromisso</Button>}</div>
  <div className="mb-4 flex flex-wrap items-center gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-primary"/>Eventos</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-accent"/>Compromissos</span><span>Horário de Brasília</span>{query.isFetching && <span role="status">Carregando agenda...</span>}</div>
  {query.isError && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-destructive">{query.error.message}<Button variant="outline" size="sm" onClick={() => query.refetch()}>Tentar novamente</Button></div>}
  <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando calendário...</p>}><OperationalCalendar events={items} canCreate={permissions.create} onRange={(start,end) => setRange(prev => prev.start === start && prev.end === end ? prev : {start,end})} onItem={openItem} onSlot={start => setEditor({appointment:null,start})}/></Suspense>
  <Dialog open={!!event} onOpenChange={open => !open && setEvent(null)}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{event?.name}</DialogTitle><DialogDescription>{event?.client?.full_name ?? 'Evento'}</DialogDescription></DialogHeader>{event && <div className="space-y-4">
   <Badge variant="outline" className={cn(EVENT_DISPLAY_STATUS_CLASSES[resolveEventStatus(event.status,event.event_date)])}>{EVENT_DISPLAY_STATUS_LABELS[resolveEventStatus(event.status,event.event_date)]}</Badge>
   <p className="flex items-center gap-2 text-sm"><Clock className="size-4 text-muted-foreground"/>{event.event_date.split('-').reverse().join('/')} · {formatTimeRange(event.start_time,event.end_time)}</p>
   {event.venue && <p className="flex items-center gap-2 text-sm"><MapPin className="size-4 shrink-0 text-muted-foreground"/>{event.venue}</p>}
   {event.service && <Badge variant="secondary">{event.service.name}</Badge>}
   {event.has_guestbook && <p className="flex items-center gap-2 text-sm"><BookHeart className="size-4 text-primary"/>Caderno de Memórias</p>}
  </div>}</DialogContent></Dialog>
  {editor && <CalendarAppointmentDialog key={editor.appointment?.id ?? editor.start} appointment={editor.appointment} initialStart={editor.start} canEdit={permissions.edit} canDelete={permissions.delete} onClose={() => setEditor(null)}/>}
 </AppShell>;
}
