import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Video, Phone, User2, Clock,
  Loader2, AlertCircle, X, CheckCircle2,
  ChevronLeft, ChevronRight, MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAppointments, useCancelAppointment } from '@/hooks/useTelehealth';
import type { AppointmentSummary, AppointmentStatus } from '@/types/telehealth';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<AppointmentStatus, string> = {
  SCHEDULED:   'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  CONFIRMED:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  COMPLETED:   'bg-muted text-muted-foreground',
  CANCELLED:   'bg-destructive/10 text-destructive',
  NO_SHOW:     'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
};

const TYPE_ICON: Record<string, React.ElementType> = {
  IN_PERSON: User2,
  VIDEO:     Video,
  PHONE:     Phone,
};

// ─── Cancel Modal ─────────────────────────────────────────────────────────────
function CancelModal({
  appointment,
  onClose,
}: {
  appointment: AppointmentSummary;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const { mutate: cancel, isPending, error } = useCancelAppointment();
  const [done, setDone] = useState(false);

  function handleCancel() {
    cancel(
      { appointmentId: appointment.id, reason },
      { onSuccess: () => setDone(true) },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-card shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Cancel Appointment</p>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-10 px-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">Appointment Cancelled</p>
            <button onClick={onClose} className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground">Close</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Cancelling appointment with{' '}
              <span className="font-medium text-foreground">{appointment.patient.name}</span>{' '}
              on {format(new Date(appointment.scheduledAt), 'MMM d, yyyy')} at{' '}
              {format(new Date(appointment.scheduledAt), 'h:mm a')}.
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for cancellation (minimum 5 characters)…"
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{(error as Error).message}</p>
              </div>
            )}

            <button
              disabled={reason.trim().length < 5 || isPending}
              onClick={handleCancel}
              className="w-full rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Cancellation'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────
function AppointmentCard({
  appt,
  onCancel,
  onJoin,
}: {
  appt: AppointmentSummary;
  onCancel: (a: AppointmentSummary) => void;
  onJoin:   (id: string) => void;
}) {
  const TypeIcon  = TYPE_ICON[appt.type] ?? User2;
  const canJoin   = appt.type === 'VIDEO' && ['CONFIRMED', 'IN_PROGRESS'].includes(appt.status);
  const canCancel = ['SCHEDULED', 'CONFIRMED'].includes(appt.status);

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{appt.patient.name.charAt(0)}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{appt.patient.name}</p>
            <p className="text-xs font-mono text-muted-foreground">{appt.patient.uhid}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{appt.hospital.name}</span>
            </div>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[appt.status]}`}>
          {appt.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(new Date(appt.scheduledAt), 'MMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{format(new Date(appt.scheduledAt), 'h:mm a')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TypeIcon className="w-3.5 h-3.5" />
          <span>{appt.type.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px]">#{appt.confirmationNumber}</span>
        </div>
      </div>

      {appt.chiefComplaint && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <span className="font-medium text-foreground">Complaint: </span>
          {appt.chiefComplaint}
        </p>
      )}

      <div className="flex gap-2">
        {canJoin && (
          <button
            onClick={() => onJoin(appt.id)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Video className="w-3.5 h-3.5" /> Join Call
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => onCancel(appt)}
            className="flex items-center gap-1.5 rounded-xl border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Tab = 'upcoming' | 'past';

export default function DoctorAppointmentsPage() {
  const navigate   = useNavigate();
  const [tab,      setTab]           = useState<Tab>('upcoming');
  const [page,     setPageNum]       = useState(1);
  const [cancelTarget, setCancelTarget] = useState<AppointmentSummary | null>(null);

  const { data, isLoading, isError } = useAppointments({
    status: (tab === 'upcoming'
      ? 'SCHEDULED,CONFIRMED,IN_PROGRESS'
      : 'COMPLETED,CANCELLED,NO_SHOW') as AppointmentSummary['status'],
    page,
    limit: 10,
  });

  function setPage(p: number) {
    setPageNum(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View your scheduled patient appointments.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border bg-card p-1 w-fit gap-1">
        {(['upcoming', 'past'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPageNum(1); }}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">Failed to load appointments. Please try again.</p>
        </div>
      )}

      {data && !isLoading && (
        <>
          {data.appointments.length === 0 ? (
            <div className="rounded-2xl border bg-card px-6 py-16 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No {tab} appointments</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.appointments.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appt={a}
                  onCancel={setCancelTarget}
                  onJoin={(id) => navigate(`/appointment/${id}/call`)}
                />
              ))}
            </div>
          )}

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
                className="p-2 rounded-lg border hover:bg-accent transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                disabled={data.page >= data.totalPages}
                onClick={() => setPage(data.page + 1)}
                className="p-2 rounded-lg border hover:bg-accent transition-colors disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {cancelTarget && (
        <CancelModal appointment={cancelTarget} onClose={() => setCancelTarget(null)} />
      )}
    </div>
  );
}
