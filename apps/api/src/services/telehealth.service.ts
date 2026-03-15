import prisma from '@/lib/prisma';
import { AppointmentStatus, AppointmentType, NotificationType, Prisma } from '@prisma/client';
import { emitToUser } from '@/lib/socket';
import { addDays, format, startOfDay, endOfDay, parseISO, isWithinInterval, addMinutes } from 'date-fns';
import type {
  BookAppointmentInput,
  CancelAppointmentInput,
  DoctorSearchInput,
  SlotQueryInput,
  AppointmentListInput,
  SubmitReviewInput,
} from '@/validators/telehealth.validator';

// ─── Helper — confirmation number ────────────────────────────────────────────

function generateConfirmationNumber(): string {
  const year  = new Date().getFullYear();
  const rand  = Math.floor(10000 + Math.random() * 90000);
  return `APT-${year}-${rand}`;
}

// ─── Helper — create notification ────────────────────────────────────────────

async function createNotification(params: {
  userId:    string;
  type:      NotificationType;
  title:     string;
  message:   string;
  link?:     string;
  metadata?: Record<string, unknown>;
}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const notif = await prisma.notification.create({
    data: {
      userId:    params.userId,
      type:      params.type,
      title:     params.title,
      message:   params.message,
      link:      params.link,
      metadata:  params.metadata ? (params.metadata as object) : undefined,
      expiresAt,
    },
  });

  emitToUser(params.userId, 'notification:new', {
    id:        notif.id,
    type:      notif.type,
    title:     notif.title,
    message:   notif.message,
    link:      notif.link,
    createdAt: notif.createdAt,
  });
}

// ─── 1. Doctor Search ─────────────────────────────────────────────────────────

export async function searchDoctors(input: DoctorSearchInput) {
  const { specialty, city, hospitalId, rating, search, page, limit } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    isVerified: true,
    ...(specialty && { specialty: { contains: specialty, mode: 'insensitive' } }),
    ...(hospitalId && { hospitalId }),
    ...(rating && { rating: { gte: rating } }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { specialty: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(city && {
      hospital: { city: { contains: city, mode: 'insensitive' } },
    }),
  };

  const [doctors, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ rating: 'desc' }, { totalReviews: 'desc' }],
      include: {
        hospital: { select: { id: true, name: true, city: true, state: true } },
      },
    }),
    prisma.doctor.count({ where }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    doctors: doctors.map((d) => ({
      id:                d.id,
      userId:            d.userId,
      name:              `Dr. ${d.firstName} ${d.lastName}`,
      specialty:         d.specialty,
      hospital:          d.hospital.name,
      hospitalId:        d.hospitalId,
      city:              d.hospital.city,
      experience:        d.experienceYears,
      consultationFee:   d.consultationFee,
      rating:            d.rating,
      totalReviews:      d.totalReviews,
      languages:         d.languages,
      photoUrl:          d.photoUrl,
      availableForVideo:    d.availableForVideo,
      availableForInPerson: d.availableForInPerson,
      appointmentTypes: [
        ...(d.availableForVideo    ? ['VIDEO']     : []),
        ...(d.availableForInPerson ? ['IN_PERSON'] : []),
        'PHONE',
      ] as AppointmentType[],
    })),
  };
}

export async function getDoctorSlots(doctorId: string, input: SlotQueryInput) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { availability: { where: { isActive: true } } },
  });

  if (!doctor) throw Object.assign(new Error('Doctor not found'), { status: 404 });

  const fromDate = input.from ? parseISO(input.from) : new Date();
  const toDate   = input.to   ? parseISO(input.to)   : addDays(fromDate, 6);

  // Fetch all booked slots in this range
  const bookedAppts = await prisma.appointment.findMany({
    where: {
      doctorId,
      scheduledAt: { gte: startOfDay(fromDate), lte: endOfDay(toDate) },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { scheduledAt: true },
  });

  const bookedSet = new Set(bookedAppts.map((a) => a.scheduledAt.toISOString()));

  // Map availability day names → 0-based index
  const dayMap: Record<string, number> = {
    SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
    THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
  };

  const slotDuration = doctor.slotDurationMinutes;
  const slots: Array<{ date: string; available: string[]; booked: string[] }> = [];

  let cursor = startOfDay(fromDate);
  while (cursor <= toDate) {
    const dayOfWeek = cursor.getDay();
    const avail = doctor.availability.find(
      (a) => dayMap[a.dayOfWeek] === dayOfWeek
    );

    if (avail) {
      const [startH, startM] = avail.startTime.split(':').map(Number);
      const [endH,   endM  ] = avail.endTime.split(':').map(Number);

      const slotStart = new Date(cursor);
      slotStart.setHours(startH, startM, 0, 0);
      const slotEnd = new Date(cursor);
      slotEnd.setHours(endH, endM, 0, 0);

      const available: string[] = [];
      const booked:    string[] = [];

      let t = slotStart;
      while (t < slotEnd) {
        const slotIso  = t.toISOString();
        const slotTime = format(t, 'HH:mm');
        if (bookedSet.has(slotIso)) {
          booked.push(slotTime);
        } else if (t > new Date()) {
          available.push(slotTime);
        }
        t = addMinutes(t, slotDuration);
      }

      slots.push({ date: format(cursor, 'yyyy-MM-dd'), available, booked });
    }

    cursor = addDays(cursor, 1);
  }

  return {
    doctorId,
    slotDurationMinutes: slotDuration,
    slots,
  };
}

// ─── 3. Book Appointment ──────────────────────────────────────────────────────

export async function bookAppointment(patientUserId: string, input: BookAppointmentInput) {
  const patient = await prisma.patient.findUnique({ where: { userId: patientUserId } });
  if (!patient) throw Object.assign(new Error('Patient profile not found'), { status: 404 });

  const doctor = await prisma.doctor.findUnique({
    where:   { id: input.doctorId },
    include: { hospital: { select: { id: true, name: true } }, user: true },
  });
  if (!doctor) throw Object.assign(new Error('Doctor not found'), { status: 404 });
  if (!doctor.isVerified) throw Object.assign(new Error('Doctor is not yet verified'), { status: 403 });

  const scheduledAt = new Date(input.scheduledAt);

  // Unique constraint on (doctorId, scheduledAt) handles double-booking at DB level
  // Additional: check patient doesn't already have a conflicting appointment
  const overlap = await prisma.appointment.findFirst({
    where: {
      patientId:   patient.id,
      scheduledAt: {
        gte: addMinutes(scheduledAt, -29),
        lte: addMinutes(scheduledAt, 29),
      },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
  });
  if (overlap) {
    throw Object.assign(
      new Error('You already have an appointment at an overlapping time'),
      { status: 409 }
    );
  }

  const confirmationNumber = generateConfirmationNumber();
  const videoRoomName =
    input.type === 'VIDEO' ? `uhid-appointment-${input.doctorId}-${Date.now()}` : null;

  const appointment = await prisma.appointment.create({
    data: {
      patientId:         patient.id,
      doctorId:          doctor.id,
      hospitalId:        doctor.hospitalId,
      scheduledAt,
      type:              input.type as AppointmentType,
      status:            'CONFIRMED',
      chiefComplaint:    input.chiefComplaint,
      notes:             input.notes,
      confirmationNumber,
      videoRoomName,
    },
    include: {
      doctor:   { include: { user: true, hospital: true } },
      hospital: { select: { name: true } },
    },
  });

  // Notify doctor
  await createNotification({
    userId:  doctor.userId,
    type:    'APPOINTMENT_BOOKED',
    title:   'New appointment booked',
    message: `${patient.firstName} ${patient.lastName} has booked an appointment on ${format(scheduledAt, 'PPp')}`,
    link:    `/doctor/appointments`,
    metadata: { appointmentId: appointment.id },
  });

  // Emit socket event to doctor
  emitToUser(doctor.userId, 'appointment:booked', {
    appointmentId:      appointment.id,
    patientName:        `${patient.firstName} ${patient.lastName}`,
    scheduledAt:        appointment.scheduledAt,
    type:               appointment.type,
    confirmationNumber: appointment.confirmationNumber,
  });

  return {
    appointmentId:      appointment.id,
    status:             appointment.status,
    scheduledAt:        appointment.scheduledAt,
    type:               appointment.type,
    confirmationNumber: appointment.confirmationNumber,
    doctor: {
      name:     `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
      hospital: appointment.hospital.name,
    },
    videoRoomName: appointment.videoRoomName,
  };
}

// ─── 4. List Appointments ─────────────────────────────────────────────────────

export async function listAppointments(
  userId: string,
  role:   'PATIENT' | 'DOCTOR',
  input:  AppointmentListInput
) {
  const { status, from, to, page, limit } = input;
  const skip = (page - 1) * limit;

  let ownerFilter: Record<string, string> = {};

  if (role === 'PATIENT') {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw Object.assign(new Error('Patient profile not found'), { status: 404 });
    ownerFilter = { patientId: patient.id };
  } else {
    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw Object.assign(new Error('Doctor profile not found'), { status: 404 });
    ownerFilter = { doctorId: doctor.id };
  }

  const statusFilter = status
    ? status.length === 1
      ? { status: status[0] as AppointmentStatus }
      : { status: { in: status as AppointmentStatus[] } }
    : {};

  const where: Prisma.AppointmentWhereInput = {
    ...ownerFilter,
    ...statusFilter,
    ...(from   && { scheduledAt: { gte: new Date(from) } }),
    ...(to     && { scheduledAt: { lte: new Date(to)   } }),
  };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { scheduledAt: 'asc' },
      include: {
        doctor:  { select: { firstName: true, lastName: true, specialty: true } },
        patient: { select: { firstName: true, lastName: true, uhid: true } },
        hospital: { select: { name: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    appointments: appointments.map((a) => ({
      id:                a.id,
      status:            a.status,
      type:              a.type,
      scheduledAt:       a.scheduledAt,
      confirmationNumber: a.confirmationNumber,
      chiefComplaint:    a.chiefComplaint,
      doctor:   { name: `Dr. ${a.doctor.firstName} ${a.doctor.lastName}`, specialty: a.doctor.specialty },
      patient:  { name: `${a.patient.firstName} ${a.patient.lastName}`, uhid: a.patient.uhid },
      hospital: { name: a.hospital.name },
      videoRoomName: a.videoRoomName,
      completedAt:   a.completedAt,
      cancelReason:  a.cancelReason,
    })),
  };
}

// ─── 5. Cancel Appointment ────────────────────────────────────────────────────

export async function cancelAppointment(
  userId: string,
  role:   'PATIENT' | 'DOCTOR',
  appointmentId: string,
  input: CancelAppointmentInput
) {
  const appt = await prisma.appointment.findUnique({
    where:   { id: appointmentId },
    include: { doctor: true, patient: true },
  });

  if (!appt) throw Object.assign(new Error('Appointment not found'), { status: 404 });
  if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appt.status)) {
    throw Object.assign(new Error('Cannot cancel this appointment'), { status: 400 });
  }

  // Verify ownership
  if (role === 'PATIENT') {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (appt.patientId !== patient?.id) {
      throw Object.assign(new Error('Forbidden'), { status: 403 });
    }
  } else {
    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    if (appt.doctorId !== doctor?.id) {
      throw Object.assign(new Error('Forbidden'), { status: 403 });
    }
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status:      'CANCELLED',
      cancelReason: input.reason,
      cancelledBy:  userId,
    },
  });

  // Notify the other party
  const notifyUserId = role === 'PATIENT' ? appt.doctor.userId : appt.patient.userId;
  const cancellerName = role === 'PATIENT'
    ? `${appt.patient.firstName} ${appt.patient.lastName}`
    : `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`;

  await createNotification({
    userId:  notifyUserId,
    type:    'APPOINTMENT_CANCELLED',
    title:   'Appointment cancelled',
    message: `${cancellerName} has cancelled the appointment on ${format(appt.scheduledAt, 'PPp')}`,
    link:    role === 'PATIENT' ? '/doctor/appointments' : '/patient/appointments',
    metadata: { appointmentId, reason: input.reason },
  });

  emitToUser(notifyUserId, 'appointment:cancelled', {
    appointmentId,
    cancelledBy: cancellerName,
    reason:      input.reason,
  });

  return updated;
}

// ─── 6. Get Jitsi Token ───────────────────────────────────────────────────────

export async function getJitsiToken(userId: string, appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where:   { id: appointmentId },
    include: { doctor: true, patient: true },
  });

  if (!appt) throw Object.assign(new Error('Appointment not found'), { status: 404 });
  if (appt.type !== 'VIDEO') throw Object.assign(new Error('Not a video appointment'), { status: 400 });
  if (appt.status === 'CANCELLED') throw Object.assign(new Error('Appointment is cancelled'), { status: 400 });

  // Check ownership
  const patient = await prisma.patient.findUnique({ where: { userId } });
  const doctor  = await prisma.doctor.findUnique({  where: { userId } });

  const isPatient = patient && appt.patientId === patient.id;
  const isDoctor  = doctor  && appt.doctorId  === doctor.id;

  if (!isPatient && !isDoctor) {
    throw Object.assign(new Error('Access denied — not your appointment'), { status: 403 });
  }

  // Time window: 15 min before to 60 min after
  const now       = new Date();
  const windowStart = addMinutes(appt.scheduledAt, -15);
  const windowEnd   = addMinutes(appt.scheduledAt, 60);

  if (!isWithinInterval(now, { start: windowStart, end: windowEnd })) {
    throw Object.assign(
      new Error('Video room is only accessible 15 minutes before to 60 minutes after the appointment'),
      { status: 403 }
    );
  }

  // Generate simple Jitsi URL (JWT signing requires JITSI_SECRET; for now return room info)
  const roomName = appt.videoRoomName ?? `uhid-appointment-${appointmentId}`;
  const domain   = process.env.JITSI_DOMAIN ?? 'meet.jit.si';

  // Simple JWT using base64 (replace with jsonwebtoken + JITSI_SECRET in production)
  const payload = {
    context: {
      user: {
        name:  isPatient
          ? `${appt.patient.firstName} ${appt.patient.lastName}`
          : `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`,
        email: '',
        id:    userId,
      },
    },
    aud:  'jitsi',
    iss:  'uhid',
    sub:  domain,
    room: roomName,
    exp:  Math.floor(windowEnd.getTime() / 1000),
  };

  const jitsiToken = Buffer.from(JSON.stringify(payload)).toString('base64');

  // Mark appointment as IN_PROGRESS if doctor joins
  if (isDoctor && appt.status === 'CONFIRMED') {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data:  { status: 'IN_PROGRESS' },
    });
    emitToUser(appt.patient.userId, 'appointment:started', { appointmentId, doctorName: `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` });
  }

  return {
    roomName,
    jitsiToken,
    domain,
    expiresAt: windowEnd,
  };
}

// ─── 7. Submit Review ─────────────────────────────────────────────────────────

export async function submitReview(
  userId: string,
  appointmentId: string,
  input: SubmitReviewInput
) {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  if (!patient) throw Object.assign(new Error('Patient profile not found'), { status: 404 });

  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) throw Object.assign(new Error('Appointment not found'), { status: 404 });
  if (appt.patientId !== patient.id) throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (appt.status !== 'COMPLETED') throw Object.assign(new Error('Can only review completed appointments'), { status: 400 });

  const review = await prisma.doctorReview.create({
    data: {
      doctorId:     appt.doctorId,
      patientId:    patient.id,
      appointmentId,
      rating:       input.rating,
      comment:      input.comment,
      isAnonymous:  input.isAnonymous,
    },
  });

  // Recalculate doctor rating
  const agg = await prisma.doctorReview.aggregate({
    where:  { doctorId: appt.doctorId },
    _avg:   { rating: true },
    _count: { rating: true },
  });

  await prisma.doctor.update({
    where: { id: appt.doctorId },
    data:  {
      rating:       Math.round((agg._avg.rating ?? 0) * 10) / 10,
      totalReviews: agg._count.rating,
    },
  });

  return review;
}

// ─── 8. Notifications — list ──────────────────────────────────────────────────

export async function listNotifications(
  userId:     string,
  unreadOnly: boolean,
  limit:      number
) {
  const where = {
    userId,
    expiresAt: { gt: new Date() },
    ...(unreadOnly && { isRead: false }),
  };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, isRead: false, expiresAt: { gt: new Date() } } }),
  ]);

  return { notifications, unreadCount };
}

// ─── 9. Notifications — mark all read ────────────────────────────────────────

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true, readAt: new Date() },
  });
  return { updatedCount: result.count };
}

// ─── 10. Mark single notification read ────────────────────────────────────────

export async function markNotificationRead(userId: string, notificationId: string) {
  const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notif)              throw Object.assign(new Error('Notification not found'), { status: 404 });
  if (notif.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  return prisma.notification.update({
    where: { id: notificationId },
    data:  { isRead: true, readAt: new Date() },
  });
}
