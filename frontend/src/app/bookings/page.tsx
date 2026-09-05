'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Booking } from '../../types';
import { BOOKING_STATUS_CONFIG, RESOURCE_TYPE_LABELS, formatDateTime, formatTimeRange } from '../../utils/format';
import { Search, Compass, AlertTriangle, ArrowRight } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';

export default function MyBookingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled' | 'all'>('upcoming');
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
      toast.error(err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingToCancel) return;
    setCancelling(true);
    try {
      await api.patch(`/bookings/${selectedBookingToCancel.id}/cancel`);
      toast.success('Reservation released. Time slot is now available to others.');
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
        const q = search.toLowerCase();
        const matchRes = b.resource_name?.toLowerCase().includes(q);
        const matchPurpose = b.purpose?.toLowerCase().includes(q);
        const matchLoc = b.resource_location?.toLowerCase().includes(q);
        if (!matchRes && !matchPurpose && !matchLoc) return false;
      }

      return true;
    });
  }, [bookings, activeTab, search, now]);

  if (authLoading || (loading && bookings.length === 0)) {
    return (
      <div className="space-y-8 py-8">
        <LoadingSkeleton className="h-10 w-48" />
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-12 py-6 animate-in fade-in duration-300">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-neutral-200 pb-8 gap-4">
        <div className="space-y-2">
          <div className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
            RESERVATION LEDGER // AUDIT TRAIL
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-charcoal-900 uppercase">
            MY BOOKINGS.
          </h1>
          <p className="text-neutral-500 font-sans text-sm max-w-xl">
            Review active appointments, past sessions, and manage cancellations.
          </p>
        </div>

        <Link
          href="/resources"
          className="px-5 py-2.5 bg-charcoal-900 hover:bg-charcoal-800 text-white font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2 self-start"
        >
          <Compass className="w-3.5 h-3.5" /> Book Space
        </Link>
      </section>

      {/* Tabs & Search */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs border-b border-neutral-200 pb-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-4 uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-1 transition-colors ${
              activeTab === 'upcoming'
                ? 'text-charcoal-900 font-bold border-b-2 border-charcoal-900'
                : 'text-neutral-400 hover:text-charcoal-900'
            }`}
          >
            UPCOMING ({bookings.filter((b) => b.status === 'confirmed' && new Date(b.end_time) >= now).length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`py-1 transition-colors ${
              activeTab === 'past'
                ? 'text-charcoal-900 font-bold border-b-2 border-charcoal-900'
                : 'text-neutral-400 hover:text-charcoal-900'
            }`}
          >
            PAST
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`py-1 transition-colors ${
              activeTab === 'cancelled'
                ? 'text-charcoal-900 font-bold border-b-2 border-charcoal-900'
                : 'text-neutral-400 hover:text-charcoal-900'
            }`}
          >
            RELEASED ({bookings.filter((b) => b.status === 'cancelled').length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`py-1 transition-colors ${
              activeTab === 'all'
                ? 'text-charcoal-900 font-bold border-b-2 border-charcoal-900'
                : 'text-neutral-400 hover:text-charcoal-900'
            }`}
          >
            ALL ({bookings.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="FILTER SESSIONS..."
            className="px-3 py-1.5 border border-neutral-300 focus:border-charcoal-900 text-xs font-mono bg-white focus:outline-none"
          />
        </div>
      </section>

      {/* Editorial List of Bookings (Zero Cards) */}
      <section>
        {filteredBookings.length === 0 ? (
          <EmptyState
            title={`No ${activeTab} reservations`}
            description={
              search
                ? 'No bookings match your filter criteria.'
                : activeTab === 'upcoming'
                ? 'You have zero upcoming scheduled sessions. Explore resources to reserve time.'
                : 'No entries recorded in this category.'
            }
            action={
              <Link
                href="/resources"
                className="px-4 py-2 bg-charcoal-900 text-white font-mono text-xs uppercase"
              >
                Explore Resources
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-neutral-200 border-t border-neutral-200">
            {filteredBookings.map((b) => {
              const statusConfig = BOOKING_STATUS_CONFIG[b.status];
              const isUpcoming = b.status === 'confirmed' && new Date(b.end_time) >= now;

              return (
                <div
                  key={b.id}
                  className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-neutral-50/60 px-2 transition-colors"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-charcoal-900">
                        {formatTimeRange(b.start_time, b.end_time)}
                      </span>
                      <span
                        className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold tracking-tight text-charcoal-900 font-sans">
                      {b.resource_name}
                    </h3>

                    <div className="text-xs font-sans text-neutral-600">
                      Agenda: <strong className="text-charcoal-800">{b.purpose}</strong> • Location: {b.resource_location}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div className="text-left md:text-right">
                      <div className="text-[10px] text-neutral-400 uppercase">DATE</div>
                      <div className="font-bold text-charcoal-900">{formatDateTime(b.start_time).split(',')[0]}</div>
                    </div>

                    {isUpcoming && (
                      <button
                        onClick={() => setSelectedBookingToCancel(b)}
                        className="px-3 py-1.5 border border-rose-300 hover:bg-rose-50 text-rose-800 font-mono text-[11px] uppercase tracking-wider transition-colors"
                      >
                        Cancel Slot
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Minimalist Cancellation Confirmation Modal */}
      <Modal
        isOpen={!!selectedBookingToCancel}
        onClose={() => setSelectedBookingToCancel(null)}
        title="CANCEL RESERVATION"
      >
        {selectedBookingToCancel && (
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 border border-amber-300 font-mono text-xs text-amber-900 space-y-2">
              <div className="font-bold uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                RELEASE TIME SLOT CONFIRMATION
              </div>
              <p className="font-sans text-xs text-neutral-700 leading-relaxed">
                Cancelling will immediately release this time range on{' '}
                <strong>{selectedBookingToCancel.resource_name}</strong>, allowing concurrent members to reserve the interval.
              </p>
            </div>

            <div className="border border-neutral-200 p-4 font-mono text-xs space-y-1 bg-neutral-50 text-neutral-600">
              <div>RESOURCE: {selectedBookingToCancel.resource_name}</div>
              <div>INTERVAL: {formatDateTime(selectedBookingToCancel.start_time)} ({formatTimeRange(selectedBookingToCancel.start_time, selectedBookingToCancel.end_time)})</div>
              <div>AGENDA: {selectedBookingToCancel.purpose}</div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingToCancel(null)}
                disabled={cancelling}
                className="px-4 py-2 border border-neutral-300 font-mono text-xs uppercase text-neutral-600 hover:bg-neutral-100"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-mono text-xs uppercase tracking-wider transition-colors"
              >
                {cancelling ? 'Releasing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
