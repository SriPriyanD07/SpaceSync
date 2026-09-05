'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Booking, BookingStatus } from '../../types';
import { BOOKING_STATUS_CONFIG, RESOURCE_TYPE_LABELS, formatDateTime, formatTimeRange } from '../../utils/format';
import {
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  XCircle,
  Search,
  CheckCircle2,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';

export default function MyBookingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [search, setSearch] = useState('');

  // Cancellation Modal State
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchBookings();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Booking[] }>('/bookings?limit=100');
      setBookings(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load your reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingToCancel) return;
    setCancelling(true);
    try {
      await api.patch(`/bookings/${selectedBookingToCancel.id}/cancel`);
      toast.success('Reservation cancelled successfully. The time slot is now released!');
      setSelectedBookingToCancel(null);
      await fetchBookings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel reservation');
    } finally {
      setCancelling(false);
    }
  };

  const now = new Date();

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bEnd = new Date(b.end_time);

      if (activeTab === 'upcoming' && (b.status === 'cancelled' || bEnd < now)) return false;
      if (activeTab === 'past' && (b.status === 'cancelled' || bEnd >= now)) return false;
      if (activeTab === 'cancelled' && b.status !== 'cancelled') return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchRes = b.resource_name?.toLowerCase().includes(query);
        const matchPurpose = b.purpose?.toLowerCase().includes(query);
        const matchLoc = b.resource_location?.toLowerCase().includes(query);
        if (!matchRes && !matchPurpose && !matchLoc) return false;
      }

      return true;
    });
  }, [bookings, activeTab, search, now]);

  if (authLoading || (loading && bookings.length === 0)) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-10 w-48" />
        <LoadingSkeleton className="h-12 w-full rounded-2xl" />
        <div className="space-y-4">
          <LoadingSkeleton className="h-28 rounded-2xl" />
          <LoadingSkeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Bookings</h1>
          <p className="text-slate-500 text-sm">
            Manage your scheduled sessions, active reservations, and booking history.
          </p>
        </div>
        <Link
          href="/resources"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Compass className="w-4 h-4" /> Book Another Resource
        </Link>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'upcoming' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming ({bookings.filter((b) => b.status === 'confirmed' && new Date(b.end_time) >= now).length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'past' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Past Sessions
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'cancelled' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancelled ({bookings.filter((b) => b.status === 'cancelled').length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({bookings.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} reservations found`}
          description={
            search
              ? 'Try clearing your search query.'
              : activeTab === 'upcoming'
              ? 'You have no scheduled bookings upcoming. Ready to reserve a room or lab bench?'
              : 'No booking records in this category.'
          }
          action={
            <Link
              href="/resources"
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              Explore Available Resources
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const statusConfig = BOOKING_STATUS_CONFIG[b.status];
            const isUpcoming = b.status === 'confirmed' && new Date(b.end_time) >= now;

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {b.resource_type ? RESOURCE_TYPE_LABELS[b.resource_type] : 'Resource'}
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">{b.resource_name}</h3>

                  <p className="text-xs text-slate-600">
                    Agenda: <strong className="text-slate-800">{b.purpose}</strong>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{b.resource_location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatTimeRange(b.start_time, b.end_time)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Reserved Date
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {formatDateTime(b.start_time)}
                    </div>
                  </div>

                  {isUpcoming && (
                    <button
                      onClick={() => setSelectedBookingToCancel(b)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!selectedBookingToCancel}
        onClose={() => setSelectedBookingToCancel(null)}
        title="Cancel Reservation"
      >
        {selectedBookingToCancel && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Are you sure you want to cancel this booking?
              </div>
              <p className="leading-relaxed">
                Cancelling will release this time slot on{' '}
                <strong>{selectedBookingToCancel.resource_name}</strong> immediately, allowing other team members to book it.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-1 text-xs text-slate-600 border border-slate-200">
              <div>
                <strong>Resource:</strong> {selectedBookingToCancel.resource_name}
              </div>
              <div>
                <strong>Time:</strong> {formatDateTime(selectedBookingToCancel.start_time)} (
                {formatTimeRange(selectedBookingToCancel.start_time, selectedBookingToCancel.end_time)})
              </div>
              <div>
                <strong>Agenda:</strong> {selectedBookingToCancel.purpose}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingToCancel(null)}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all"
              >
                {cancelling ? 'Releasing Slot...' : 'Confirm & Release Slot'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
