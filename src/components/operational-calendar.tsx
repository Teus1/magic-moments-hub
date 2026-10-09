import { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import luxonPlugin from '@fullcalendar/luxon3';
import ptBr from '@fullcalendar/core/locales/pt-br';
import type { EventInput } from '@fullcalendar/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CALENDAR_ZONE, calendarToday } from '@/lib/calendar';
import { useState } from 'react';
export default function OperationalCalendar({ events, onRange, onItem, onSlot, canCreate }: {
 events: EventInput[]; onRange: (start: string,end: string) => void; onItem: (id: string) => void;
 onSlot: (date: string) => void; canCreate: boolean;
}) {
 const ref = useRef<FullCalendar>(null);
 const [title,setTitle] = useState('');
 const [view,setView] = useState('dayGridMonth');
 function changeView(next: string) { ref.current?.getApi().changeView(next); }
 return <div className="operational-calendar min-w-0">
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
   <div className="flex items-center gap-1">
    <Button variant="outline" size="sm" onClick={() => ref.current?.getApi().gotoDate(calendarToday())}>Hoje</Button>
    <Button variant="ghost" size="icon" aria-label={view === 'dayGridMonth' ? 'Mês anterior' : 'Dia anterior'} onClick={() => ref.current?.getApi().prev()}><ChevronLeft className="size-4"/></Button>
    <Button variant="ghost" size="icon" aria-label={view === 'dayGridMonth' ? 'Próximo mês' : 'Próximo dia'} onClick={() => ref.current?.getApi().next()}><ChevronRight className="size-4"/></Button>
   </div>
   <h2 className="text-lg font-semibold capitalize sm:text-xl">{title}</h2>
   <div className="flex gap-1" role="group" aria-label="Visualização da agenda">
    <Button size="sm" variant={view === 'dayGridMonth' ? 'default' : 'outline'} onClick={() => changeView('dayGridMonth')}>Mês</Button>
    <Button size="sm" variant={view === 'timeGridDay' ? 'default' : 'outline'} onClick={() => changeView('timeGridDay')}>Dia</Button>
   </div>
  </div>
  <FullCalendar ref={ref} plugins={[dayGridPlugin,timeGridPlugin,interactionPlugin,luxonPlugin]} locale={ptBr} timeZone={CALENDAR_ZONE}
   initialDate={calendarToday()} initialView="dayGridMonth" headerToolbar={false} height={680} firstDay={1} fixedWeekCount={false}
   events={events} editable={false} selectable={false} nowIndicator allDayText="Sem horário" slotMinTime="00:00:00" slotMaxTime="24:00:00"
   slotDuration="00:30:00" slotLabelInterval="01:00:00" slotLabelFormat={{hour:'2-digit',minute:'2-digit',hour12:false}}
   eventTimeFormat={{hour:'2-digit',minute:'2-digit',hour12:false}} displayEventEnd dayMaxEvents={3} slotEventOverlap={false}
   eventMinHeight={36} scrollTime="07:00:00" expandRows
   datesSet={info => {setTitle(info.view.title);setView(info.view.type);onRange(info.startStr.slice(0,10),info.endStr.slice(0,10));}}
   dateClick={info => { if(info.view.type === 'dayGridMonth') ref.current?.getApi().changeView('timeGridDay',info.dateStr); else if(canCreate) onSlot(info.dateStr.slice(0,16)); }}
   eventClick={info => onItem(info.event.id)}
   eventDidMount={info => {info.el.setAttribute('title',`${info.event.title}${info.event.extendedProps['detail'] ? ` — ${info.event.extendedProps['detail']}` : ''}`);}}
   eventContent={info => <div className="calendar-item-content"><span className="calendar-item-time">{info.timeText}</span><strong>{info.event.title}</strong>{info.view.type === 'timeGridDay' && <span className="calendar-item-detail">{info.event.extendedProps['detail']}</span>}</div>}
  />
 </div>;
}
