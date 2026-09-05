'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '../../../services/api';
import { Resource, ResourceAvailabilityResponse, AvailabilitySlot } from '../../../types';
import { RESOURCE_TYPE_LABELS, RESOURCE_STATUS_CONFIG, formatDateTime, formatTimeRange } from '../../../utils/format';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';

export default function ResourceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params as { id: string };
  const { isAuthenticated, user, quickLogin } = useAuth();
  const toast = useToast();

  const [resource, setResource] = useState<Resource | null>(null);
  const [availability, setAvailability] = useState<ResourceAvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected date (default today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Booking Form State
  const [startHour, setStartHour] = useState<number>(10);
  const [endHour, setEndHour] = useState<number>(12);
  const [purpose, setPurpose] = useState<string>('Team Design Review');
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchResourceData();
    }
  }, [id, selectedDate]);

  const fetchResourceData = async () => {
    try {
      setLoading(true);
      const [resData, availData] = await Promise.all([
        api.get<{ resource: Resource }>(`/resources/${id}`),
        api.get<ResourceAvailabilityResponse>(`/resources/${id}/availability?date=${selectedDate}`),
      ]);
      setResource(resData.resource);
      setAvailability(availData);
    } catch (err: any) {
      console.error('Error fetching availability', err);
      toast.error(err.message || 'Failed to load resource availability');
    } finally {
      setLoading(false);
    }
  };

  const shiftDate = (offsetDays: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + offsetDays);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Convert selected hour to ISO string for submission
  const getIsoTimestamp = (hour: number) => {
    return `${selectedDate}T${String(hour).padStart(2, '0')}:00:00.000Z`;
  };

  // Client-side overlap detection for visual feedback
  const clientOverlapCheck = useMemo(() => {
    if (!availability || !availability.confirmedBookings) return null;

    const chosenStart = new Date(getIsoTimestamp(startHour));
    const chosenEnd = new Date(getIsoTimestamp(endHour));

    if (chosenEnd <= chosenStart) {
      return { hasError: true, message: 'End time must be after start time.' };
    }

    const collision = availability.confirmedBookings.find((b) => {
      if (b.status !== 'confirmed') return false;
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      // Interval overlap condition: chosenStart < bEnd && chosenEnd > bStart
      return chosenStart < bEnd && chosenEnd > bStart;
    });

    if (collision) {
      return {
        hasConflict: true,
        message: `Conflicts with existing reservation: "${collision.purpose}" (${formatTimeRange(
          collision.start_time,
          collision.end_time
        )})`,
      };
    }

    return { hasConflict: false };
  }, [availability, selectedDate, startHour, endHour]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please log in to book a resource.');
      router.push('/login');
      return;
    }

    setConflictError('');
    setSubmitting(true);

    const startTimeIso = getIsoTimestamp(startHour);
    const endTimeIso = getIsoTimestamp(endHour);

    try {
      await api.post('/bookings', {
        resource_id: id,
        start_time: startTimeIso,
        end_time: endTimeIso,
        purpose: purpose.trim(),
      });

      toast.success('🎉 Booking confirmed successfully! Double-booking check passed.');
      // Refresh availability immediately
      await fetchResourceData();
    } catch (err: any) {
      if (err.statusCode === 409) {
        setConflictError(err.message || 'This resource is already booked during the selected time.');
        toast.error('Booking Conflict! The requested time slot is unavailable.');
      } else {
        toast.error(err.message || 'Failed to create booking.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !resource) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-10 w-48" />
        <LoadingSkeleton className="h-48 rounded-2xl" />
        <LoadingSkeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-slate-800">Resource not found</h2>
        <Link href="/resources" className="text-indigo-600 underline text-sm mt-2 inline-block">
          Return to Resources
        </Link>
      </div>
    );
  }

  const statusConfig = RESOURCE_STATUS_CONFIG[resource.status];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link href="/resources" className="hover:text-indigo-600 transition-colors">
          Resources
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">{resource.name}</span>
      </div>

      {/* Resource Spec Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {RESOURCE_TYPE_LABELS[resource.type] || resource.type}
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
              >
                {statusConfig.label}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {resource.name}
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed">
              {resource.description || 'High quality organizational shared asset.'}
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-500" />
                <span>{resource.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>
                  Capacity: <strong>{resource.capacity}</strong> {resource.capacity === 1 ? 'person / unit' : 'attendees'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 max-w-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-indigo-800">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Double-Booking Shield
            </div>
            <p className="leading-relaxed text-indigo-700 text-[11px]">
              Protected by PostgreSQL exclusion constraints (`btree_gist`) and transaction locks. Race conditions are mathematically rejected with 409 Conflict.
            </p>
          </div>
        </div>
      </div>

      {/* Date Navigation & Availability Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visual Timeline (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Date Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  Availability Schedule
                </h2>
                <p className="text-xs text-slate-500">Hourly breakdown from 08:00 AM to 08:00 PM</p>
              </div>

              {/* Date Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  onClick={() => shiftDate(1)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Timeline Slot Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-2">
                <span>TIME SLOT</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
                  </span>
                  <span className="flex items-center gap-1 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Reserved
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/40">
                {availability?.slots.map((slot) => {
                  const hourNum = parseInt(slot.hour.split(':')[0], 10);
                  const isSelectedStart = hourNum === startHour;
                  const isInSelectedRange = hourNum >= startHour && hourNum < endHour;

                  return (
                    <div
                      key={slot.hour}
                      onClick={() => {
                        if (slot.isAvailable) {
                          setStartHour(hourNum);
                          setEndHour(hourNum + 1);
                        }
                      }}
                      className={`p-3 sm:px-4 flex items-center justify-between transition-all cursor-pointer ${
                        isInSelectedRange
                          ? 'bg-indigo-100/80 border-l-4 border-indigo-600'
                          : slot.isAvailable
                          ? 'hover:bg-emerald-50/60 bg-white'
                          : 'bg-rose-50/50 hover:bg-rose-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-slate-700 w-16">
                          {slot.hour}
                        </span>

                        {slot.isAvailable ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Open Slot • Click to select
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              Reserved: {slot.booking?.purpose || 'Scheduled Meeting'}
                            </span>
                            {slot.booking?.userName && (
                              <div className="text-[10px] text-slate-500">
                                Reserved by {slot.booking.userName}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        {slot.isAvailable ? (
                          <span className="text-[11px] font-semibold text-indigo-600 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                            Select
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-rose-700 px-2 py-0.5 rounded bg-rose-100/60 border border-rose-200">
                            Occupied
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form Card (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Make a Reservation</h3>
              <p className="text-xs text-slate-500">Configure time and confirm booking</p>
            </div>

            {conflictError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1 animate-in shake">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  409 Conflict Detected
                </div>
                <p className="leading-snug">{conflictError}</p>
              </div>
            )}

            {clientOverlapCheck?.hasConflict && !conflictError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Schedule Conflict Warning
                </div>
                <p className="text-[11px] leading-snug">{clientOverlapCheck.message}</p>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <select
                    value={startHour}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setStartHour(val);
                      if (endHour <= val) setEndHour(val + 1);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    End Time
                  </label>
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                      <option key={h} value={h} disabled={h <= startHour}>
                        {String(h).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Booking Purpose / Agenda
                </label>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Sprint Planning, Client Demo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Demo Action Helper */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800">Quick Test Preset:</span>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStartHour(10);
                      setEndHour(12);
                      setPurpose('Architecture Review 10:00-12:00');
                    }}
                    className="px-2 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 font-mono text-[10px]"
                  >
                    Set 10:00–12:00
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartHour(11);
                      setEndHour(13);
                      setPurpose('Attempted Overlap 11:00-13:00');
                    }}
                    className="px-2 py-1 rounded bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 font-mono text-[10px]"
                  >
                    Set 11:00–13:00 (Conflict)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartHour(12);
                      setEndHour(14);
                      setPurpose('Back-to-Back 12:00-14:00');
                    }}
                    className="px-2 py-1 rounded bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-mono text-[10px]"
                  >
                    Set 12:00–14:00 (Allowed)
                  </button>
                </div>
              </div>

              {isAuthenticated ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Confirm Reservation <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => quickLogin('member1')}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 text-xs flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" /> 1-Click Login as Member to Book
                  </button>
                  <Link
                    href="/login"
                    className="block text-center text-xs text-indigo-600 hover:underline"
                  >
                    Sign in with existing credentials
                  </Link>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
