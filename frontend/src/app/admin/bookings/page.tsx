'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../services/api';
import { Booking } from '../../../types';
import { BOOKING_STATUS_CONFIG, RESOURCE_TYPE_LABELS, formatDateTime, formatTimeRange } from '../../../utils/format';
import {
  Calendar,
  Clock,
  Search,
  ChevronLeft,
  XCircle,
  Filter,
  User,
  MapPin,
  AlertTriangle,
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin" className="hover:text-indigo-600 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Admin Hub
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Master Booking Oversight
          </h1>
          <p className="text-slate-500 text-sm">
            Inspect all scheduled sessions, member activities, and administrative slot cancellations.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, resource, or agenda purpose..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed Only</option>
            <option value="cancelled">Cancelled Only</option>
          </select>
          <div className="text-xs text-slate-500 px-2 font-medium">
            Showing {filtered.length} records
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      {loading ? (
        <LoadingSkeleton className="h-64 rounded-2xl" />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Resource</th>
                  <th className="py-3.5 px-4">Reserved By</th>
                  <th className="py-3.5 px-4">Time Slot</th>
                  <th className="py-3.5 px-4">Purpose</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((b) => {
                  const statusConfig = BOOKING_STATUS_CONFIG[b.status];
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{b.resource_name}</div>
                        <div className="text-[11px] text-slate-500">{b.resource_location}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{b.user_name}</div>
                        <div className="text-[11px] text-slate-500">{b.user_email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {formatDateTime(b.start_time)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatTimeRange(b.start_time, b.end_time)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="line-clamp-2 text-slate-700">{b.purpose}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {b.status === 'confirmed' ? (
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                          >
                            Cancel Slot
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Released</span>
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
        title="Admin Cancellation Override"
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Administrative Cancellation
              </div>
              <p>
                Are you sure you want to cancel the booking for <strong>{selectedBooking.user_name}</strong> on{' '}
                <strong>{selectedBooking.resource_name}</strong>? This will free the slot immediately.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-600 space-y-1 border border-slate-200">
              <div>
                <strong>Agenda:</strong> {selectedBooking.purpose}
              </div>
              <div>
                <strong>Scheduled:</strong> {formatDateTime(selectedBooking.start_time)}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Dismiss
              </button>
              <button
                onClick={handleAdminCancel}
                disabled={cancelling}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
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
