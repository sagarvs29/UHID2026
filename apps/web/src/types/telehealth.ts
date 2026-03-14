// ─── Enums ────────────────────────────────────────────────────────────────────

export type AppointmentType   = 'IN_PERSON' | 'VIDEO' | 'PHONE';
export type AppointmentStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type NotificationType =
  | 'CONSENT_REQUEST' | 'CONSENT_APPROVED' | 'CONSENT_DENIED' | 'CONSENT_REVOKED' | 'CONSENT_EXPIRED'
  | 'RECORD_UPLOADED' | 'PRESCRIPTION_CREATED'
  | 'APPOINTMENT_BOOKED' | 'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_REMINDER' | 'APPOINTMENT_STARTED'
  | 'EMERGENCY_ALERT' | 'CLAIM_DECISION' | 'GENERAL';

// ─── Doctor Discovery ─────────────────────────────────────────────────────────

export interface DoctorCard {
  id:                   string;
  userId:               string;
  name:                 string;
  specialty:            string;
  hospital:             string;
  hospitalId:           string;
  city:                 string;
  experience:           number;
  consultationFee:      number;
  rating:               number;
  totalReviews:         number;
  languages:            string[];
  photoUrl:             string | null;
  availableForVideo:    boolean;
  availableForInPerson: boolean;
  appointmentTypes:     AppointmentType[];
}

export interface DoctorsResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  doctors:    DoctorCard[];
}

export interface DoctorSearchFilters {
  specialty?:  string;
  city?:       string;
  hospitalId?: string;
  rating?:     number;
  available?:  'true' | 'false';
  search?:     string;
  page?:       number;
  limit?:      number;
}

// ─── Slots ────────────────────────────────────────────────────────────────────

export interface DaySlots {
  date:      string;
  available: string[];
  booked:    string[];
}

export interface SlotsResponse {
  doctorId:            string;
  slotDurationMinutes: number;
  slots:               DaySlots[];
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export interface AppointmentSummary {
  id:                 string;
  status:             AppointmentStatus;
  type:               AppointmentType;
  scheduledAt:        string;
  confirmationNumber: string;
  chiefComplaint:     string | null;
  doctor:             { name: string; specialty: string };
  patient:            { name: string; uhid: string };
  hospital:           { name: string };
  videoRoomName:      string | null;
  completedAt:        string | null;
  cancelReason:       string | null;
}

export interface AppointmentsResponse {
  total:        number;
  page:         number;
  limit:        number;
  totalPages:   number;
  appointments: AppointmentSummary[];
}

export interface BookAppointmentInput {
  doctorId:       string;
  scheduledAt:    string;
  type:           AppointmentType;
  chiefComplaint?: string;
  notes?:         string;
}

export interface BookAppointmentResult {
  appointmentId:      string;
  status:             AppointmentStatus;
  scheduledAt:        string;
  type:               AppointmentType;
  confirmationNumber: string;
  doctor:             { name: string; hospital: string };
  videoRoomName:      string | null;
}

export interface AppointmentListFilters {
  status?: AppointmentStatus;
  from?:   string;
  to?:     string;
  page?:   number;
  limit?:  number;
}

export interface JitsiTokenResult {
  roomName:   string;
  jitsiToken: string;
  domain:     string;
  expiresAt:  string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationItem {
  id:        string;
  type:      NotificationType;
  title:     string;
  message:   string;
  link:      string | null;
  isRead:    boolean;
  readAt:    string | null;
  metadata:  Record<string, unknown> | null;
  createdAt: string;
  expiresAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount:   number;
}
