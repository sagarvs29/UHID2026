import { useState } from 'react';
import {
  Search, MapPin, Star, Video, User2, Phone,
  Loader2, AlertCircle, ChevronLeft, ChevronRight,
  Calendar, X, Clock, CheckCircle2, Eye,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import {
  useDoctorSearch, useDoctorSlots, useBookAppointment,
} from '@/hooks/useTelehealth';
import type { DoctorCard, AppointmentType, DoctorSearchFilters } from '@/types/telehealth';

// ─── Slot Picker Modal ─────────────────────────────────────────────────────────
function SlotPickerModal({
  doctor,
  onClose,
}: {
  doctor: DoctorCard;
  onClose: () => void;
}) {
  const today      = format(new Date(), 'yyyy-MM-dd');
  const weekOut    = format(addDays(new Date(), 6), 'yyyy-MM-dd');
  const { data: slotsData, isLoading } = useDoctorSlots(doctor.id, today, weekOut);

  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [apptType,     setApptType]     = useState<AppointmentType>('IN_PERSON');
  const [complaint,    setComplaint]    = useState('');
  const [booked,       setBooked]       = useState(false);
  const { mutate: book, isPending, error } = useBookAppointment();

  const typeOptions: { value: AppointmentType; label: string; icon: React.ElementType }[] = [
    { value: 'IN_PERSON', label: 'In Person',  icon: User2 },
    { value: 'VIDEO',     label: 'Video Call', icon: Video },
    { value: 'PHONE',     label: 'Phone',      icon: Phone },
  ];

  function handleBook() {
    if (!selectedSlot) return;
    book(
      {
        doctorId:      doctor.id,
        scheduledAt:   `${selectedSlot.date}T${selectedSlot.time}:00.000Z`,
        type:          apptType,
        chiefComplaint: complaint || undefined,
      },
      { onSuccess: () => setBooked(true) },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border bg-card shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
          <div>
            <p className="text-sm font-semibold text-foreground">Book Appointment</p>
            <p className="text-xs text-muted-foreground">{doctor.name} · {doctor.specialty}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {booked ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-base font-semibold text-foreground">Appointment Confirmed!</p>
            <p className="text-sm text-muted-foreground text-center">
              Your appointment on {selectedSlot?.date} at {selectedSlot?.time} has been booked.
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto p-5 space-y-5">
            {/* Appointment type */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Appointment Type
              </p>
              <div className="grid grid-cols-3 gap-2">
                {typeOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setApptType(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors ${
                      apptType === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Available slots */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Available Slots (next 7 days)
              </p>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : !slotsData?.slots.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No available slots in the next 7 days.
                </p>
              ) : (
                <div className="space-y-3">
                  {slotsData.slots.map((day) => (
                    <div key={day.date}>
                      <p className="text-xs font-medium text-foreground mb-1.5">
                        {format(new Date(day.date + 'T00:00:00'), 'EEEE, MMM d')}
                      </p>
                      {!day.available.length ? (
                        <p className="text-xs text-muted-foreground italic">Fully booked</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {day.available.map((time) => (
                            <button
                              key={time}
                              onClick={() => setSelectedSlot({ date: day.date, time })}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                                selectedSlot?.date === day.date && selectedSlot?.time === time
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                              }`}
                            >
                              <Clock className="inline w-3 h-3 mr-1" />
                              {time}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chief complaint */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Chief Complaint <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for visit…"
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">
                  {(error as Error).message || 'Booking failed. Please try again.'}
                </p>
              </div>
            )}

            <button
              disabled={!selectedSlot || isPending}
              onClick={handleBook}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {isPending ? 'Booking…' : 'Confirm Appointment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────
function DoctorCardItem({
  doctor,
  onBook,
  onView,
}: {
  doctor: DoctorCard;
  onBook: (d: DoctorCard) => void;
  onView: (d: DoctorCard) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Avatar + name */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {doctor.photoUrl ? (
            <img src={doctor.photoUrl} alt={doctor.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-primary">{doctor.name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{doctor.name}</p>
          <p className="text-xs text-primary font-medium">{doctor.specialty}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">{doctor.hospital} · {doctor.city}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted/40 px-2 py-2">
          <p className="text-sm font-bold text-foreground">{doctor.experience}yr</p>
          <p className="text-[10px] text-muted-foreground">Experience</p>
        </div>
        <div className="rounded-xl bg-muted/40 px-2 py-2">
          <div className="flex items-center justify-center gap-0.5">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-bold text-foreground">{doctor.rating.toFixed(1)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{doctor.totalReviews} reviews</p>
        </div>
        <div className="rounded-xl bg-muted/40 px-2 py-2">
          <p className="text-sm font-bold text-foreground">₹{doctor.consultationFee}</p>
          <p className="text-[10px] text-muted-foreground">Fee</p>
        </div>
      </div>

      {/* Availability badges */}
      <div className="flex flex-wrap gap-1.5">
        {doctor.availableForInPerson && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <User2 className="w-3 h-3" /> In Person
          </span>
        )}
        {doctor.availableForVideo && (
          <span className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400">
            <Video className="w-3 h-3" /> Video
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onView(doctor)}
          title="View details"
          className="flex-0 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={() => onBook(doctor)}
          className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Book Appointment
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FindDoctorPage() {
  const [filters, setFilters] = useState<DoctorSearchFilters>({ page: 1, limit: 12 });
  const [search,    setSearch]    = useState('');
  const [specialty, setSpecialty] = useState('');
  const [city,      setCity]      = useState('');
  const [bookTarget, setBookTarget] = useState<DoctorCard | null>(null);
  const [viewTarget, setViewTarget] = useState<DoctorCard | null>(null);

  const { data, isLoading, isError } = useDoctorSearch(filters);

  function applySearch() {
    setFilters((prev) => ({
      ...prev,
      search:    search    || undefined,
      specialty: specialty || undefined,
      city:      city      || undefined,
      page:      1,
    }));
  }

  function setPage(p: number) {
    setFilters((prev) => ({ ...prev, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Find a Doctor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search and book appointments with doctors at your hospital.
        </p>
      </div>

      {/* Search bar */}
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Search by doctor name or keyword…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Specialty (e.g. Cardiology)"
            className="flex-1 min-w-36 px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="flex-1 min-w-28 px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={applySearch}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">Failed to load doctors. Please try again.</p>
        </div>
      )}

      {data && !isLoading && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data.total} doctor{data.total !== 1 ? 's' : ''} found
            </p>
          </div>

          {data.doctors.length === 0 ? (
            <div className="rounded-2xl border bg-card px-6 py-16 text-center">
              <User2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No doctors found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.doctors.map((d) => (
                <DoctorCardItem key={d.id} doctor={d} onBook={setBookTarget} onView={setViewTarget} />
              ))}
            </div>
          )}

          {/* Pagination */}
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

      {/* Slot Picker Modal */}
      {bookTarget && (
        <SlotPickerModal doctor={bookTarget} onClose={() => setBookTarget(null)} />
      )}

      {/* Doctor Detail Modal */}
      {viewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setViewTarget(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border bg-card shadow-xl overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Doctor details</p>
                <p className="text-xs text-muted-foreground">{viewTarget.name} · {viewTarget.specialty}</p>
              </div>
              <button onClick={() => setViewTarget(null)} className="rounded-lg p-1 hover:bg-accent transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {viewTarget.photoUrl ? (
                    <img src={viewTarget.photoUrl} alt={viewTarget.name} className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">{viewTarget.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{viewTarget.name}</h3>
                  <p className="text-sm text-muted-foreground">{viewTarget.specialty} · {viewTarget.hospital}</p>
                  <p className="text-sm mt-2">Experience: <span className="font-medium">{viewTarget.experience} yrs</span></p>
                  <p className="text-sm">Languages: <span className="font-medium">{viewTarget.languages.join(', ')}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/40 px-3 py-3">
                  <p className="text-xs text-muted-foreground">Consultation Fee</p>
                  <p className="text-sm font-semibold">₹{viewTarget.consultationFee}</p>
                </div>
                <div className="rounded-xl bg-muted/40 px-3 py-3">
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="text-sm font-semibold">{viewTarget.rating.toFixed(1)} • {viewTarget.totalReviews} reviews</p>
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <p className="text-sm font-semibold mb-2">Availability</p>
                <div className="text-sm text-muted-foreground">{viewTarget.availableForInPerson ? 'In Person ' : ''}{viewTarget.availableForVideo ? '· Video' : ''}</div>
                <p className="text-xs text-muted-foreground mt-2">To book, click 'Book Appointment' on the doctor card. You will see available slots and be able to confirm.</p>
              </div>

              <div className="flex justify-end">
                <button onClick={() => { setBookTarget(viewTarget); setViewTarget(null); }} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Book Appointment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
