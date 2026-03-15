import { useState, useEffect } from 'react';
import {
  useDoctorAvailability,
  useSetAvailability,
  useUpdateDoctorSettings,
} from '@/hooks/useProfile';
import type { AvailabilityDay, AvailabilitySlot } from '@/hooks/useProfile';
import {
  Settings,
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Video,
  MapPin,
  DollarSign,
  Timer,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const DAYS: AvailabilityDay[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];

const DAY_LABELS: Record<AvailabilityDay, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

function defaultSlots(): Record<AvailabilityDay, { startTime: string; endTime: string; isActive: boolean }> {
  const obj: Record<string, { startTime: string; endTime: string; isActive: boolean }> = {};
  DAYS.forEach((d) => {
    obj[d] = { startTime: '09:00', endTime: '17:00', isActive: false };
  });
  return obj as Record<AvailabilityDay, { startTime: string; endTime: string; isActive: boolean }>;
}

export default function DoctorSettingsPage() {
  const { data, isLoading, isError } = useDoctorAvailability();
  const setAvailability = useSetAvailability();
  const updateSettings = useUpdateDoctorSettings();

  // Settings state
  const [consultationFee, setConsultationFee]     = useState(0);
  const [slotDuration, setSlotDuration]           = useState(30);
  const [availableForVideo, setAvailableForVideo] = useState(false);
  const [availableForInPerson, setAvailableForInPerson] = useState(false);

  // Availability state
  const [slots, setSlots] = useState(defaultSlots);

  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  // Populate from server
  useEffect(() => {
    if (!data) return;
    setConsultationFee(data.settings.consultationFee ?? 0);
    setSlotDuration(data.settings.slotDurationMinutes ?? 30);
    setAvailableForVideo(data.settings.availableForVideo);
    setAvailableForInPerson(data.settings.availableForInPerson);

    const fresh = defaultSlots();
    data.slots.forEach((s: AvailabilitySlot) => {
      fresh[s.dayOfWeek] = {
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
      };
    });
    setSlots(fresh);
  }, [data]);

  const handleSaveSettings = () => {
    updateSettings.mutate(
      {
        consultationFee,
        slotDurationMinutes: slotDuration,
        availableForVideo,
        availableForInPerson,
      },
      {
        onSuccess: () => {
          setSettingsSuccess(true);
          setTimeout(() => setSettingsSuccess(false), 3000);
        },
      },
    );
  };

  const handleSaveSchedule = () => {
    const activeSlots = DAYS
      .filter((d) => slots[d].isActive)
      .map((d) => ({
        dayOfWeek: d,
        startTime: slots[d].startTime,
        endTime: slots[d].endTime,
        isActive: true,
      }));

    if (activeSlots.length === 0) return;

    setAvailability.mutate(
      { slots: activeSlots },
      {
        onSuccess: () => {
          setScheduleSuccess(true);
          setTimeout(() => setScheduleSuccess(false), 3000);
        },
      },
    );
  };

  const toggleDay = (day: AvailabilityDay) => {
    setSlots((prev) => ({
      ...prev,
      [day]: { ...prev[day], isActive: !prev[day].isActive },
    }));
  };

  const updateSlotTime = (day: AvailabilityDay, field: 'startTime' | 'endTime', value: string) => {
    setSlots((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
        <p className="text-sm font-medium text-red-800">Failed to load availability settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Availability & Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your consultation settings and weekly schedule.
        </p>
      </div>

      {/* ─── Consultation Settings ─── */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Consultation Settings
        </h3>

        {settingsSuccess && (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-800">Settings saved!</p>
          </div>
        )}

        {updateSettings.isError && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">{updateSettings.error?.message ?? 'Failed to save settings.'}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Consultation Fee (₹)
            </label>
            <input
              type="number"
              min={0}
              value={consultationFee}
              onChange={(e) => setConsultationFee(Number(e.target.value))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
              <Timer className="w-4 h-4 text-muted-foreground" />
              Slot Duration (minutes)
            </label>
            <select
              value={slotDuration}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              {[10, 15, 20, 30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => setAvailableForVideo(!availableForVideo)}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              availableForVideo
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-muted text-muted-foreground'
            }`}
          >
            {availableForVideo ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            <Video className="w-4 h-4" />
            Video Consultations
          </button>
          <button
            type="button"
            onClick={() => setAvailableForInPerson(!availableForInPerson)}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              availableForInPerson
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-muted text-muted-foreground'
            }`}
          >
            {availableForInPerson ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            <MapPin className="w-4 h-4" />
            In-Person Visits
          </button>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={updateSettings.isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>

      {/* ─── Weekly Schedule ─── */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Weekly Schedule
        </h3>
        <p className="text-xs text-muted-foreground">
          Toggle the days you are available and set your working hours.
        </p>

        {scheduleSuccess && (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-800">Schedule saved!</p>
          </div>
        )}

        {setAvailability.isError && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">{setAvailability.error?.message ?? 'Failed to save schedule.'}</p>
          </div>
        )}

        <div className="space-y-3">
          {DAYS.map((day) => {
            const slot = slots[day];
            return (
              <div
                key={day}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  slot.isActive ? 'border-primary/40 bg-primary/5' : 'border-muted bg-muted/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex items-center gap-2 text-sm font-medium min-w-[120px] ${
                    slot.isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {slot.isActive ? (
                    <ToggleRight className="w-5 h-5 text-primary" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                  {DAY_LABELS[day]}
                </button>

                {slot.isActive && (
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlotTime(day, 'startTime', e.target.value)}
                      className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlotTime(day, 'endTime', e.target.value)}
                      className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSaveSchedule}
          disabled={setAvailability.isPending || DAYS.every((d) => !slots[d].isActive)}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {setAvailability.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Schedule
        </button>
      </div>
    </div>
  );
}
