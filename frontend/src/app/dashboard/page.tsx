'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Booking, Resource } from '../../types';
import { RESOURCE_TYPE_LABELS, BOOKING_STATUS_CONFIG, formatDateTime, formatTimeRange } from '../../utils/format';
import { ArrowRight, Clock, MapPin, Compass, ArrowUpRight } from 'lucide-react';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';

export default function MemberDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, resourcesRes] = await Promise.all([
        api.get<{ data: Booking[] }>('/bookings?limit=20'),
        api.get<{ data: Resource[] }>('/resources?status=active&limit=8'),
      ]);
      setBookings(bookingsRes.data || []);
      setResources(resourcesRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (!isAuthenticated && loading)) {
    return (
      <div className="space-y-8 py-8">
        <LoadingSkeleton className="h-12 w-96" />
        <LoadingSkeleton className="h-32 w-full" />
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    );
  }

  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.end_time) >= now
  );
  const nextReservation = upcomingBookings[0] || null;

  // Hourly slots for Today's timeline (08:00 to 20:00)
  const timelineHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  return (
    <div className="space-y-16 py-6 animate-in fade-in duration-300">
      {/* 1. Header: Editorial greeting */}
      <section className="border-b border-neutral-200 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
            WORKSPACE // DASHBOARD
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-charcoal-900 uppercase">
            GOOD {now.getHours() < 12 ? 'MORNING' : 'AFTERNOON'}, {user?.name?.split(' ')[0] || 'MEMBER'}.
          </h1>
          <p className="text-neutral-500 font-sans text-sm">
            Your shared spaces, active schedules, and resource availability at a glance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/resources"
            className="px-5 py-2.5 bg-charcoal-900 hover:bg-charcoal-800 text-white font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <Compass className="w-3.5 h-3.5" /> Book Space
          </Link>
        </div>
      </section>

      {/* 2. Next Reservation: Full-Width Information Band (NO CARDS) */}
      <section className="space-y-3">
        <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
          UPCOMING // NEXT SCHEDULED EVENT
        </div>

        {nextReservation ? (
          <div className="p-8 border border-charcoal-900 bg-charcoal-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="font-mono text-xs text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE RESERVATION CONFIRMED
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight uppercase">
                {nextReservation.resource_name}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400 pt-1">
                <span>{formatDateTime(nextReservation.start_time)}</span>
                <span>•</span>
                <span>{formatTimeRange(nextReservation.start_time, nextReservation.end_time)}</span>
                <span>•</span>
                <span>{nextReservation.resource_location}</span>
              </div>
              <p className="text-xs text-neutral-300 font-sans pt-1">
                Agenda: <strong>{nextReservation.purpose}</strong>
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <Link
                href="/bookings"
                className="px-5 py-3 border border-neutral-600 hover:border-white font-mono text-xs text-white uppercase tracking-wider transition-colors"
              >
                Manage Bookings →
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-8 border border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-mono text-xs font-bold text-charcoal-900 uppercase">
                No active bookings scheduled for today.
              </div>
              <p className="text-xs text-neutral-500 font-sans">
                Reserve conference rooms, compute stations, or research benches with instant confirmation.
              </p>
            </div>
            <Link
              href="/resources"
              className="px-5 py-2.5 border border-charcoal-900 font-mono text-xs uppercase tracking-wider hover:bg-white transition-colors"
            >
              Explore Directory →
            </Link>
          </div>
        )}
      </section>

      {/* 3. Today's Full-Width Continuous Timeline Band */}
      <section className="space-y-4">
        <div className="flex justify-between items-baseline border-b border-neutral-200 pb-3">
          <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
            TODAY&apos;S SCHEDULE // 08:00 — 20:00
          </div>
          <span className="font-mono text-[10px] text-neutral-400">
            {now.toISOString().split('T')[0]}
          </span>
        </div>

        <div className="border border-neutral-200 bg-white p-6 space-y-6">
          {/* Hours Ruler */}
          <div className="grid grid-cols-12 text-center font-mono text-[11px] text-neutral-400 border-b border-neutral-100 pb-2">
            {timelineHours.slice(0, 12).map((h) => (
              <div key={h}>{String(h).padStart(2, '0')}</div>
            ))}
          </div>

          {/* User's Bookings on Timeline */}
          {upcomingBookings.length > 0 ? (
            <div className="space-y-3">
              {upcomingBookings.slice(0, 3).map((b) => (
                <div key={b.id} className="space-y-1">
                  <div className="flex justify-between font-mono text-xs text-charcoal-800">
                    <span className="font-bold">{b.resource_name}</span>
                    <span>{formatTimeRange(b.start_time, b.end_time)}</span>
                  </div>
                  <div className="h-6 bg-neutral-100 relative overflow-hidden">
                    <div className="h-full bg-charcoal-900 text-white font-mono text-[10px] flex items-center px-3 tracking-wider">
                      CONFIRMED • {b.purpose}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center font-mono text-xs text-neutral-400">
              NO SESSIONS CURRENTLY ACTIVE ON TODAY&apos;S TIMELINE
            </div>
          )}
        </div>
      </section>

      {/* 4. Upcoming Reservations (Clean Editorial List) */}
      <section className="space-y-4">
        <div className="flex justify-between items-baseline border-b border-neutral-200 pb-3">
          <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
            UPCOMING RESERVATIONS ({upcomingBookings.length})
          </div>
          <Link
            href="/bookings"
            className="font-mono text-xs text-charcoal-900 hover:underline uppercase tracking-wider flex items-center gap-1"
          >
            All Bookings <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <EmptyState
            title="Zero active reservations"
            description="You have no upcoming bookings. Select an available room or device to schedule time."
            action={
              <Link
                href="/resources"
                className="px-4 py-2 bg-charcoal-900 text-white font-mono text-xs uppercase"
              >
                Open Resource Directory
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-neutral-200">
            {upcomingBookings.map((b) => (
              <div
                key={b.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50 px-2 transition-colors"
              >
                <div className="space-y-1">
                  <div className="font-bold text-charcoal-900 text-base font-sans">
                    {b.resource_name}
                  </div>
                  <div className="text-xs text-neutral-500 font-sans">
                    Purpose: <strong className="text-charcoal-800">{b.purpose}</strong> • Location: {b.resource_location}
                  </div>
                </div>

                <div className="flex items-center gap-6 font-mono text-xs">
                  <div className="text-left md:text-right">
                    <div className="font-bold text-charcoal-900">{formatDateTime(b.start_time)}</div>
                    <div className="text-neutral-400">{formatTimeRange(b.start_time, b.end_time)}</div>
                  </div>
                  <Link
                    href="/bookings"
                    className="text-neutral-500 hover:text-charcoal-900 underline text-[11px]"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Resource Availability Directory (Full-Width Table) */}
      <section className="space-y-4">
        <div className="flex justify-between items-baseline border-b border-neutral-200 pb-3">
          <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
            RESOURCE AVAILABILITY DIRECTORY
          </div>
          <Link
            href="/resources"
            className="font-mono text-xs text-charcoal-900 hover:underline uppercase tracking-wider flex items-center gap-1"
          >
            View All ({resources.length}) <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="border border-neutral-200 bg-white overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {resources.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-charcoal-900 font-sans text-sm">{r.name}</td>
                  <td className="py-3.5 px-4 text-neutral-500 uppercase">{RESOURCE_TYPE_LABELS[r.type] || r.type}</td>
                  <td className="py-3.5 px-4 text-neutral-400">{r.location}</td>
                  <td className="py-3.5 px-4 text-neutral-700">{r.capacity}</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-semibold">AVAILABLE</td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/resources/${r.id}`}
                      className="inline-block px-3 py-1 bg-charcoal-900 hover:bg-charcoal-800 text-white font-mono text-[10px] uppercase tracking-wider transition-colors"
                    >
                      Schedule →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
