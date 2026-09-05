'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../services/api';
import { Booking } from '../../../types';
import { BOOKING_STATUS_CONFIG, formatDateTime, formatTimeRange } from '../../../utils/format';
import {
  Search,
  ChevronLeft,
  X,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';

export default function AdminBookingsPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  // Cancel modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isAdmin) {
        router.push('/dashboard');
        return;
      }
      fetchMasterBookings();
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const fetchMasterBookings = async () => {
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

  const handleAdminCancel = async () => {
    if (!selectedBooking) return;
    setCancelling(true);
    try {
      await api.patch(`/bookings/${selectedBooking.id}/cancel`);
      toast.success('Reservation cancelled by admin. Time slot released.');
      setSelectedBooking(null);
      await fetchMasterBookings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel reservation');
    } finally {
      setCancelling(false);
    }
  };

  const filtered = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.resource_name?.toLowerCase().includes(q) ||
      b.user_name?.toLowerCase().includes(q) ||
      b.user_email?.toLowerCase().includes(q) ||
      b.purpose?.toLowerCase().includes(q)
    );
  });

  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;
  const uniqueUsers = new Set(bookings.map((b) => b.user_email)).size;

  return (
    <div className="space-y-12 animate-in fade-in duration-300 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-neutral-200 pb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400 uppercase tracking-widest mb-3">
            <Link href="/admin" className="hover:text-neutral-900 transition-colors flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> ADMIN OPERATIONS
            </Link>
            <span>/</span>
            <span className="text-neutral-900">AUDIT LEDGER</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-neutral-950 font-serif">
            Master Booking Oversight
          </h1>
          <p className="text-neutral-500 text-sm mt-1 max-w-2xl font-sans">
            Comprehensive audit log of all resource allocations, reserved timeframes, and administrative slot releases.
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-neutral-200 bg-white">
        <div className="p-6 border-r border-b lg:border-b-0 border-neutral-200">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Total Reservations</div>
          <div className="text-3xl font-light text-neutral-950 mt-1 font-mono">{bookings.length}</div>
          <div className="text-xs text-neutral-500 mt-1">Lifetime booking logs</div>
        </div>
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-neutral-200">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Confirmed (Active)</div>
          <div className="text-3xl font-light text-neutral-950 mt-1 font-mono">{confirmedCount}</div>
          <div className="text-xs text-neutral-500 mt-1">Occupying slots</div>
        </div>
        <div className="p-6 border-r border-neutral-200">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Released / Cancelled</div>
          <div className="text-3xl font-light text-neutral-400 mt-1 font-mono">{cancelledCount}</div>
          <div className="text-xs text-neutral-500 mt-1">Returned to inventory</div>
        </div>
        <div className="p-6">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Unique Reservers</div>
          <div className="text-3xl font-light text-neutral-950 mt-1 font-mono">{uniqueUsers}</div>
          <div className="text-xs text-neutral-500 mt-1">Active team members</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-neutral-200 bg-white p-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reserver name, email, resource or agenda purpose..."
              className="w-full pl-10 pr-4 py-2 bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none font-mono"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto border-t md:border-t-0 border-neutral-100 pt-2 md:pt-0">
            {[
              { id: 'all', label: 'ALL LOGS' },
              { id: 'confirmed', label: 'CONFIRMED ONLY' },
              { id: 'cancelled', label: 'RELEASED ONLY' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-neutral-950 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Master Booking Table */}
      {loading ? (
        <LoadingSkeleton className="h-96 w-full" />
      ) : filtered.length === 0 ? (
        <div className="border border-neutral-200 bg-white p-12 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-400">No reservation records match criteria</p>
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
            }}
            className="mt-4 font-mono text-xs text-neutral-900 underline uppercase tracking-wider cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/80 border-b border-neutral-200 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                <tr>
                  <th className="py-3 px-4 w-12 text-neutral-400">REF</th>
                  <th className="py-3 px-4 font-normal">RESOURCE & ZONE</th>
                  <th className="py-3 px-4 font-normal">RESERVED BY</th>
                  <th className="py-3 px-4 font-normal">SCHEDULED TIMEFRAME</th>
                  <th className="py-3 px-4 font-normal">AGENDA / PURPOSE</th>
                  <th className="py-3 px-4 font-normal">STATUS</th>
                  <th className="py-3 px-4 font-normal text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((b, idx) => {
                  const statusConfig = BOOKING_STATUS_CONFIG[b.status];
                  return (
                    <tr key={b.id} className="hover:bg-neutral-50/60 transition-colors group">
                      <td className="py-4 px-4 font-mono text-[11px] text-neutral-400">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-neutral-950">{b.resource_name}</div>
                        <div className="font-mono text-[11px] text-neutral-500 mt-0.5">{b.resource_location}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-neutral-900 font-medium">{b.user_name}</div>
                        <div className="font-mono text-[11px] text-neutral-400 mt-0.5">{b.user_email}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-mono text-[11px] text-neutral-900">
                          {formatDateTime(b.start_time).split(',')[0]}
                        </div>
                        <div className="font-mono text-[11px] text-neutral-500 mt-0.5">
                          {formatTimeRange(b.start_time, b.end_time)}
                        </div>
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        <div className="line-clamp-2 text-neutral-600 text-xs">{b.purpose}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border ${
                            b.status === 'confirmed'
                              ? 'bg-neutral-950 text-white border-neutral-950'
                              : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                          }`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {b.status === 'confirmed' ? (
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="font-mono text-[11px] text-rose-700 hover:text-rose-900 underline cursor-pointer transition-colors"
                          >
                            RELEASE SLOT
                          </button>
                        ) : (
                          <span className="font-mono text-[10px] text-neutral-300 uppercase">RELEASED</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Cancellation Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="ADMINISTRATIVE CANCELLATION"
      >
        {selectedBooking && (
          <div className="space-y-6 pt-2">
            <div className="p-4 border border-rose-200 bg-rose-50/40 text-xs text-rose-950 space-y-2">
              <div className="font-mono font-bold flex items-center gap-1.5 uppercase tracking-wider text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Slot Revocation Warning
              </div>
              <p className="font-sans leading-relaxed">
                You are about to release the reservation held by <strong>{selectedBooking.user_name}</strong> for{' '}
                <strong>{selectedBooking.resource_name}</strong>. The space will be marked as available immediately.
              </p>
            </div>

            <div className="border border-neutral-200 bg-neutral-50/50 p-4 font-mono text-xs text-neutral-700 space-y-2">
              <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                <span className="text-neutral-400 uppercase">Reserver</span>
                <span className="text-neutral-900 font-medium">{selectedBooking.user_name} ({selectedBooking.user_email})</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                <span className="text-neutral-400 uppercase">Resource</span>
                <span className="text-neutral-900 font-medium">{selectedBooking.resource_name}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                <span className="text-neutral-400 uppercase">Slot</span>
                <span className="text-neutral-900 font-medium">{formatDateTime(selectedBooking.start_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 uppercase">Agenda</span>
                <span className="text-neutral-900 truncate max-w-xs">{selectedBooking.purpose}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={handleAdminCancel}
                disabled={cancelling}
                className="px-6 py-2.5 font-mono text-xs uppercase tracking-widest bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {cancelling ? 'Releasing...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

