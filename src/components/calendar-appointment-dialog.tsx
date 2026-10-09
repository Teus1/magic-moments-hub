import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { appointmentSchema, type AppointmentDraft, type CalendarAppointment } from '@/lib/calendar';
import { calendarEventOptions, saveCalendarAppointment, deleteCalendarAppointment } from '@/lib/calendar.functions';
export function CalendarAppointmentDialog({ appointment, initialStart, canEdit, canDelete, onClose }: {
 appointment: CalendarAppointment | null; initialStart: string; canEdit: boolean; canDelete: boolean; onClose: () => void;
}) {
 const queryClient = useQueryClient();
 const getOptions = useServerFn(calendarEventOptions);
 const save = useServerFn(saveCalendarAppointment);
 const remove = useServerFn(deleteCalendarAppointment);
 const [editing,setEditing] = useState(!appointment);
 const [confirm,setConfirm] = useState(false);
 const [error,setError] = useState('');
 const [draft,setDraft] = useState<AppointmentDraft>(() => {
  const end = new Date(`${initialStart}:00Z`); end.setUTCHours(end.getUTCHours()+1);
  return appointment ? {...appointment,start_at:appointment.start_at.slice(0,16),end_at:appointment.end_at.slice(0,16)} : {event_id:'',title:'',start_at:initialStart,end_at:end.toISOString().slice(0,16),venue:'',observations:''};
 });
 const options = useQuery({queryKey:['calendar-event-options'],queryFn:() => getOptions(),enabled:editing});
 async function invalidate() { await queryClient.invalidateQueries({queryKey:['operational-calendar']}); }
 const saving = useMutation({mutationFn:async () => {
  const parsed = appointmentSchema.safeParse(draft);
  if(!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Confira os campos obrigatórios.');
  return save({data:{id:appointment?.id ?? null,draft:parsed.data}});
 },onSuccess:async () => {await invalidate();toast.success('Compromisso salvo.');onClose();},onError:e => setError(e.message)});
 const deleting = useMutation({mutationFn:() => remove({data:{id:appointment?.id ?? ''}}),onSuccess:async () => {await invalidate();toast.success('Compromisso excluído.');onClose();},onError:e => {setConfirm(false);setError(e.message);}});
 function field<K extends keyof AppointmentDraft>(key: K,value: AppointmentDraft[K]) {setDraft(prev => ({...prev,[key]:value}));}
 const busy = saving.isPending || deleting.isPending;
 return <>
  <Dialog open onOpenChange={open => !open && !busy && onClose()}>
   <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
    <DialogHeader><DialogTitle>{editing ? (appointment ? 'Editar compromisso' : 'Novo compromisso') : appointment?.title}</DialogTitle><DialogDescription>{editing ? 'Compromisso operacional vinculado a um evento.' : appointment?.event?.name}</DialogDescription></DialogHeader>
    {editing ? <form className="space-y-4" onSubmit={e => {e.preventDefault();setError('');saving.mutate();}}>
     <div className="space-y-2"><Label htmlFor="appointment-event">Evento <span className="text-destructive">*</span></Label>
      <Select value={draft.event_id} onValueChange={v => field('event_id',v)} disabled={options.isPending || options.isError}><SelectTrigger id="appointment-event" className="w-full"><SelectValue placeholder={options.isPending ? 'Carregando eventos...' : 'Selecione um evento'}/></SelectTrigger><SelectContent>{options.data?.map(e => <SelectItem key={e.id} value={e.id}>{e.name} · {e.event_date.split('-').reverse().join('/')}{e.status === 'cancelled' ? ' · Cancelado' : ''}</SelectItem>)}</SelectContent></Select>
      {options.isError && <div className="text-sm text-destructive">{options.error.message} <Button type="button" variant="link" onClick={() => options.refetch()}>Tentar novamente</Button></div>}
      {options.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento disponível para vincular.</p>}
     </div>
     <div className="space-y-2"><Label htmlFor="appointment-title">Título <span className="text-destructive">*</span></Label><Input id="appointment-title" value={draft.title} maxLength={200} required onChange={e => field('title',e.target.value)}/></div>
     <div className="grid gap-4 sm:grid-cols-2">
      <div className="min-w-0 space-y-2"><Label htmlFor="appointment-start">Início <span className="text-destructive">*</span></Label><Input className="min-w-0" type="datetime-local" id="appointment-start" required value={draft.start_at} onChange={e => field('start_at',e.target.value)}/></div>
      <div className="min-w-0 space-y-2"><Label htmlFor="appointment-end">Término <span className="text-destructive">*</span></Label><Input className="min-w-0" type="datetime-local" id="appointment-end" required value={draft.end_at} onChange={e => field('end_at',e.target.value)}/></div>
     </div>
     <div className="space-y-2"><Label htmlFor="appointment-venue">Local</Label><Input id="appointment-venue" value={draft.venue} onChange={e => field('venue',e.target.value)}/></div>
     <div className="space-y-2"><Label htmlFor="appointment-notes">Observações</Label><Textarea id="appointment-notes" value={draft.observations} onChange={e => field('observations',e.target.value)}/></div>
     {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
     <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => appointment ? setEditing(false) : onClose()}>Cancelar</Button><Button type="submit" disabled={busy || options.isError || options.data?.length === 0}>{saving.isPending ? 'Salvando...' : 'Salvar'}</Button></div>
    </form> : <div className="space-y-4">
     {appointment?.event?.status === 'cancelled' && <p className="text-sm text-destructive">Evento cancelado</p>}
     <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm"><dt className="text-muted-foreground">Início</dt><dd>{formatWall(draft.start_at)}</dd><dt className="text-muted-foreground">Término</dt><dd>{formatWall(draft.end_at)}</dd>{draft.venue && <><dt className="text-muted-foreground">Local</dt><dd className="break-words">{draft.venue}</dd></>}</dl>
     {draft.observations && <p className="whitespace-pre-wrap break-words text-sm">{draft.observations}</p>}
     {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
     <div className="flex justify-end gap-2">{canDelete && <Button variant="outline" onClick={() => setConfirm(true)}><Trash2 className="size-4"/>Excluir</Button>}{canEdit && <Button onClick={() => setEditing(true)}><Pencil className="size-4"/>Editar</Button>}</div>
    </div>}
   </DialogContent>
  </Dialog>
  <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir compromisso?</AlertDialogTitle><AlertDialogDescription>O compromisso “{appointment?.title}” será excluído. O evento vinculado não será alterado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e => {e.preventDefault();deleting.mutate();}}>{deleting.isPending ? 'Excluindo...' : 'Excluir'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}
function formatWall(v: string) {const [date,time] = v.split('T');return `${date?.split('-').reverse().join('/')} às ${time?.slice(0,5)}`;}
