'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../services/api';
import { Resource, ResourceAvailabilityResponse } from '../../../types';
import { RESOURCE_TYPE_LABELS, RESOURCE_STATUS_CONFIG, formatTimeRange } from '../../../utils/format';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Clock,
  MapPin,
  Users,
  Check,
  AlertCircle,
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

  // Selected date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Booking Form State
  const [startHour, setStartHour] = useState<number>(10);
  const [endHour, setEndHour] = useState<number>(12);
  const [purpose, setPurpose] = useState<string>('Architecture Review');
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
      console.error('Error loading resource', err);
      toast.error(err.message || 'Failed to fetch resource data');
    } finally {
      setLoading(false);
    }
  };

  const shiftDate = (offsetDays: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getIsoTimestamp = (hour: number) => {
    return `${selectedDate}T${String(hour).padStart(2, '0')}:00:00.000Z`;
  };

  // Client-side overlap pre-check
  const clientCollision = useMemo(() => {
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
      return chosenStart < bEnd && chosenEnd > bStart;
    });

    if (collision) {
      return {
        hasConflict: true,
        message: `This resource is already reserved for "${collision.purpose}" (${formatTimeRange(
          collision.start_time,
          collision.end_time
        )}).`,
      };
    }

    return { hasConflict: false };
  }, [availability, selectedDate, startHour, endHour]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Sign in required to confirm booking.');
      router.push('/login');
      return;
    }

    setConflictError('');
    setSubmitting(true);

    try {
      await api.post('/bookings', {
        resource_id: id,
        start_time: getIsoTimestamp(startHour),
        end_time: getIsoTimestamp(endHour),
        purpose: purpose.trim(),
      });

      toast.success('Reservation confirmed. Concurrency check passed.');
      await fetchResourceData();
    } catch (err: any) {
      if (err.statusCode === 409) {
        setConflictError(err.message || 'This resource is already booked during the selected time.');
      } else {
        toast.error(err.message || 'Failed to create reservation');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !resource) {
    return (
      <div className="space-y-8 py-8">
        <LoadingSkeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <LoadingSkeleton className="lg:col-span-5 h-96" />
          <LoadingSkeleton className="lg:col-span-7 h-96" />
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-bold text-charcoal-900">Resource not found</h2>
        <Link href="/resources" className="text-xs font-mono underline mt-2 inline-block">
          Return to directory
        </Link>
      </div>
    );
  }

  const durationHours = endHour - startHour;

  return (
    <div className="space-y-12 py-6 animate-in fade-in duration-300">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
        <Link href="/resources" className="hover:text-charcoal-900 transition-colors">
          RESOURCES
        </Link>
        <span>/</span>
        <span className="text-charcoal-900 font-semibold">{resource.name.toUpperCase()}</span>
      </div>

      {/* Main Split Layout: Left Spec & Form • Right Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* LEFT COLUMN: Resource Identity & Deliberate Reservation Form */}
        <div className="lg:col-span-5 space-y-10">
          {/* Resource Identity */}
          <div className="space-y-4">
            <div className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
              SPECIFICATION // {RESOURCE_TYPE_LABELS[resource.type] || resource.type}
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-charcoal-900 uppercase leading-[0.95]">
              {resource.name}
            </h1>

            <p className="font-sans text-sm text-neutral-600 leading-relaxed pt-1">
              {resource.description || 'Shared institutional resource with automated occupancy management.'}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200 font-mono text-xs">
              <div>
                <div className="text-[10px] text-neutral-400 uppercase">LOCATION</div>
                <div className="font-bold text-charcoal-900">{resource.location}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400 uppercase">CAPACITY</div>
                <div className="font-bold text-charcoal-900">
                  {resource.capacity} {resource.capacity === 1 ? 'Person' : 'Persons'}
                </div>
              </div>
            </div>
          </div>

          {/* Deliberate Reservation Form */}
          <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-6">
            <div className="border-b border-neutral-200 pb-3 flex justify-between items-baseline">
              <span className="font-mono text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                BOOK RESOURCE
              </span>
              <span className="font-mono text-[10px] text-neutral-400">
                {selectedDate}
              </span>
            </div>

            {/* Inline Conflict State Notice */}
            {(conflictError || clientCollision?.hasConflict) && (
              <div className="p-4 bg-rose-50 border border-rose-300 font-mono text-xs space-y-1 animate-in fade-in">
                <div className="text-rose-800 font-bold uppercase flex items-center justify-between">
                  <span>{String(startHour).padStart(2, '0')}:00 → {String(endHour).padStart(2, '0')}:00 UNAVAILABLE</span>
                  <span className="text-[10px]">409 CONFLICT</span>
                </div>
                <p className="font-sans text-xs text-rose-700 leading-relaxed">
                  {conflictError || clientCollision?.message}
                </p>
                <div className="text-[10px] text-neutral-500 pt-1 font-mono">
                  Select another available interval from the schedule.
                </div>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              {/* Date Input */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 focus:border-charcoal-900 font-mono text-xs focus:outline-none"
                />
              </div>

              {/* Interval Start & End */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                    Start Time
                  </label>
                  <select
                    value={startHour}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setStartHour(v);
                      if (endHour <= v) setEndHour(v + 1);
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 focus:border-charcoal-900 font-mono text-xs bg-white focus:outline-none"
                  >
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                    End Time
                  </label>
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 focus:border-charcoal-900 font-mono text-xs bg-white focus:outline-none"
                  >
                    {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                      <option key={h} value={h} disabled={h <= startHour}>
                        {String(h).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purpose / Agenda */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                  Purpose / Agenda
                </label>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Client Architecture Kickoff"
                  className="w-full px-3 py-2 border border-neutral-300 focus:border-charcoal-900 text-xs focus:outline-none font-sans"
                />
              </div>

              {/* Summary Metadata */}
              <div className="border-t border-neutral-100 pt-3 flex justify-between font-mono text-xs text-neutral-500">
                <span>DURATION: {durationHours} {durationHours === 1 ? 'HOUR' : 'HOURS'}</span>
                <span>
                  {clientCollision?.hasConflict ? (
                    <span className="text-rose-700 font-bold">● UNAVAILABLE</span>
                  ) : (
                    <span className="text-emerald-700 font-bold">● READY</span>
                  )}
                </span>
              </div>

              {/* Preset Buttons for Fast Demo */}
              <div className="pt-2 border-t border-neutral-100 font-mono text-[10px] text-neutral-400 space-y-1">
                <div>DEMO PRESETS:</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStartHour(10);
                      setEndHour(12);
                      setPurpose('Architecture Review 10:00-12:00');
                    }}
                    className="px-2 py-1 border border-neutral-200 hover:border-charcoal-900 text-charcoal-800"
                  >
                    10:00–12:00 (Base)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartHour(11);
                      setEndHour(13);
                      setPurpose('Conflict Attempt 11:00-13:00');
                    }}
                    className="px-2 py-1 border border-rose-300 text-rose-800 hover:bg-rose-50"
                  >
                    11:00–13:00 (Conflict)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartHour(12);
                      setEndHour(14);
                      setPurpose('Back-to-Back 12:00-14:00');
                    }}
                    className="px-2 py-1 border border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                  >
                    12:00–14:00 (Allowed)
                  </button>
                </div>
              </div>

              {/* Submit Trigger */}
              {isAuthenticated ? (
                <button
                  type="submit"
                  disabled={submitting || !!clientCollision?.hasConflict}
                  className="w-full py-3 bg-charcoal-900 hover:bg-charcoal-800 text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Confirming...' : 'Confirm Reservation'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => quickLogin('member1')}
                  className="w-full py-3 bg-charcoal-900 hover:bg-charcoal-800 text-white font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" /> 1-Click Login as Member to Book
                </button>
              )}
            </form>
          </div>

          {/* Database Concurrency Note */}
          <div className="border border-neutral-200 p-4 font-mono text-[10px] text-neutral-500 space-y-1">
            <div className="font-bold text-charcoal-900 uppercase">
              POSTGRESQL CONCURRENCY SHIELD
            </div>
            <p className="font-sans text-xs text-neutral-600 leading-relaxed">
              Protected by PostgreSQL range exclusion constraint: <code>EXCLUDE USING gist (resource_id WITH =, tstzrange(start_time, end_time) WITH &&) WHERE (status = &apos;confirmed&apos;)</code>.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Visual Availability Timeline Schedule */}
        <div className="lg:col-span-7 space-y-6">
          <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-6">
            {/* Header with Date Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-neutral-200 pb-4 gap-4">
              <div>
                <div className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
                  SCHEDULE AUDIT // 08:00 — 20:00
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-charcoal-900">
                  AVAILABILITY TIMELINE
                </h3>
              </div>

              {/* Date Controls */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-1.5 border border-neutral-300 hover:border-charcoal-900 text-charcoal-800"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 border border-neutral-300 text-xs focus:outline-none"
                />
                <button
                  onClick={() => shiftDate(1)}
                  className="p-1.5 border border-neutral-300 hover:border-charcoal-900 text-charcoal-800"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Timeline Legend */}
            <div className="flex items-center justify-between font-mono text-[10px] text-neutral-400 border-b border-neutral-100 pb-2">
              <span>INTERVAL (1 HOUR)</span>
              <div className="flex items-center gap-4">
                <span className="text-emerald-700">● VACANT</span>
                <span className="text-rose-700">● RESERVED</span>
                <span className="text-charcoal-900 font-bold">█ YOUR SELECTION</span>
              </div>
            </div>

            {/* Precision Vertical Timeline */}
            <div className="divide-y divide-neutral-200 border-t border-b border-neutral-200">
              {availability?.slots.map((slot) => {
                const hourNum = parseInt(slot.hour.split(':')[0], 10);
                const isSelected = hourNum >= startHour && hourNum < endHour;

                return (
                  <div
                    key={slot.hour}
                    onClick={() => {
                      if (slot.isAvailable) {
                        setStartHour(hourNum);
                        setEndHour(hourNum + 1);
                      }
                    }}
                    className={`py-3.5 px-3 sm:px-4 flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-charcoal-900 text-white'
                        : slot.isAvailable
                        ? 'hover:bg-neutral-50 bg-white text-charcoal-800'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`font-mono text-xs w-14 font-bold ${isSelected ? 'text-neutral-300' : 'text-charcoal-900'}`}>
                        {slot.hour}
                      </span>

                      {slot.isAvailable ? (
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className={`text-[11px] ${isSelected ? 'text-white' : 'text-emerald-700'}`}>
                            {isSelected ? '● SELECTED INTERVAL' : 'AVAILABLE • CLICK TO SELECT'}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="font-mono text-xs font-bold text-rose-700 uppercase">
                            RESERVED // {slot.booking?.purpose || 'SCHEDULED SESSION'}
                          </div>
                          {slot.booking?.userName && (
                            <div className="font-mono text-[10px] text-neutral-400">
                              BY {slot.booking.userName.toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="font-mono text-[10px] uppercase tracking-wider">
                      {isSelected ? (
                        <span className="text-emerald-400 font-bold">[SELECTED]</span>
                      ) : slot.isAvailable ? (
                        <span className="text-neutral-400 hover:text-charcoal-900">[SELECT]</span>
                      ) : (
                        <span className="text-rose-700 font-bold">[OCCUPIED]</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
