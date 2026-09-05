'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Booking, Resource } from '../../types';
import { RESOURCE_TYPE_LABELS, BOOKING_STATUS_CONFIG, formatDateTime, formatTimeRange } from '../../utils/format';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Compass,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  CalendarCheck2,
  Search,
} from 'lucide-react';
import { LoadingSkeleton, CardSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';

export default function MemberDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
        api.get<{ data: Booking[] }>('/bookings?limit=10'),
        api.get<{ data: Resource[] }>('/resources?status=active&limit=4'),
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
      <div className="space-y-6">
        <LoadingSkeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.end_time) >= now
  );
  const nextBooking = upcomingBookings[0] || null;

  const totalHours = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((acc, b) => {
      const diffHours = (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / (1000 * 60 * 60);
      return acc + diffHours;
    }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Quick Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-3xl p-8 shadow-lg">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-700/60 text-indigo-200 text-xs font-semibold">
            <span>Member Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Explorer'}!
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
            Book meeting rooms, high-compute workstations, projectors, and research spaces instantly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            href="/resources"
            className="px-5 py-3 rounded-xl font-semibold bg-white text-indigo-900 hover:bg-indigo-50 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
          >
            <Compass className="w-4 h-4 text-indigo-600" />
            Book a Resource
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Upcoming Bookings</div>
            <div className="text-2xl font-bold text-slate-900">{upcomingBookings.length}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total Hours Reserved</div>
            <div className="text-2xl font-bold text-slate-900">{Math.round(totalHours)} hrs</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total Reservations</div>
            <div className="text-2xl font-bold text-slate-900">{bookings.length}</div>
          </div>
        </div>
      </div>

      {/* Next Upcoming Booking Highlight Banner */}
      {nextBooking && (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-slate-50 border border-indigo-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                <Clock className="w-3.5 h-3.5" /> Next Scheduled Reservation
              </div>
              <h3 className="text-lg font-bold text-slate-900">{nextBooking.resource_name}</h3>
              <p className="text-xs text-slate-600 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {nextBooking.resource_location} • Purpose: {nextBooking.purpose}
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <div className="text-sm font-bold text-indigo-900">
                {formatDateTime(nextBooking.start_time)}
              </div>
              <div className="text-xs text-slate-500">
                {formatTimeRange(nextBooking.start_time, nextBooking.end_time)}
              </div>
              <Link
                href="/bookings"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-1"
              >
                Manage My Bookings <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Available Resources Quick Showcase */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Featured Available Resources</h2>
            <p className="text-xs text-slate-500">Explore shared facilities and reserve your slot</p>
          </div>
          <Link
            href="/resources"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View All Resources →
          </Link>
        </div>

        {resources.length === 0 && !loading ? (
          <EmptyState
            title="No resources found"
            description="Resources have not been provisioned yet. Admin can seed or add resources."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {resources.map((res) => (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {RESOURCE_TYPE_LABELS[res.type] || res.type}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Available
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{res.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{res.description}</p>
                  </div>

                  <div className="space-y-1 pt-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{res.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Capacity: {res.capacity} {res.capacity === 1 ? 'person/device' : 'people'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100">
                  <Link
                    href={`/resources/${res.id}`}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Check Availability & Book →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Bookings Activity */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Booking History</h2>
            <p className="text-xs text-slate-500">Recent reservations and cancellations</p>
          </div>
          <Link
            href="/bookings"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Manage All ({bookings.length}) →
          </Link>
        </div>

        {bookings.length === 0 && !loading ? (
          <EmptyState
            title="You haven't made any bookings yet"
            description="Browse shared resources and schedule your first reservation."
            action={
              <Link
                href="/resources"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
              >
                Browse Resources
              </Link>
            }
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {bookings.slice(0, 5).map((b) => {
                const statusConfig = BOOKING_STATUS_CONFIG[b.status];
                return (
                  <div
                    key={b.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{b.resource_name}</h4>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Purpose: <span className="text-slate-700 font-medium">{b.purpose}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                      <div className="sm:text-right">
                        <div className="font-semibold text-slate-800">
                          {formatDateTime(b.start_time)}
                        </div>
                        <div className="text-slate-500">
                          {formatTimeRange(b.start_time, b.end_time)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
