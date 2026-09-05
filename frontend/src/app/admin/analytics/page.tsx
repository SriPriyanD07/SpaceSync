'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { UtilizationData } from '../../../types';
import { RESOURCE_TYPE_LABELS } from '../../../utils/format';
import {
  BarChart3,
  ChevronLeft,
  Clock,
  Layers,
  Database,
  TrendingUp,
  Flame,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';

export default function AdminAnalyticsPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<UtilizationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isAdmin) {
        router.push('/dashboard');
        return;
      }
      fetchAnalytics();
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get<UtilizationData>('/admin/utilization');
      setData(res);
    } catch (err) {
      console.error('Failed to load utilization analytics', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton className="h-80 rounded-2xl" />
          <LoadingSkeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Format peak hours data
  const peakChartData = (data?.peakHours || []).map((p) => ({
    hour: `${String(p.hour).padStart(2, '0')}:00`,
    Bookings: parseInt(p.count, 10),
  }));

  // Format bookings by type
  const typeChartData = (data?.byResourceType || []).map((t) => ({
    type: RESOURCE_TYPE_LABELS[t.type] || t.type,
    Bookings: parseInt(t.booking_count, 10),
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
          <Link href="/admin" className="hover:text-indigo-600 flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Admin Hub
          </Link>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Deep Utilization & Operational Intelligence
        </h1>
        <p className="text-slate-500 text-sm">
          Granular occupancy metrics calculated directly from PostgreSQL queries without caching.
        </p>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Peak Hours Chart */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Peak Booking Periods
              </h3>
              <p className="text-xs text-slate-500">Distribution of confirmed reservations across hours of the day</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">PostgreSQL EXTRACT(HOUR)</span>
          </div>

          <div className="h-72 w-full pt-4">
            {peakChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No peak hour data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Bookings" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bookings By Resource Type */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                Reservations by Asset Class
              </h3>
              <p className="text-xs text-slate-500">Occupancy demand across meeting rooms, compute, and lab pods</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">GROUP BY r.type</span>
          </div>

          <div className="h-72 w-full pt-4">
            {typeChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No classification data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="type" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Bookings" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Utilization Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-6 sm:p-7">
        <div>
          <h3 className="text-base font-bold text-slate-900">Per-Resource Utilization Ledger</h3>
          <p className="text-xs text-slate-500">
            Total bookings and accumulated reservation hours per facility
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Total Bookings</th>
                <th className="py-3 px-4">Booked Hours</th>
                <th className="py-3 px-4 text-right">Direct Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(data?.resourceUtilization || []).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{r.name}</td>
                  <td className="py-3.5 px-4">{RESOURCE_TYPE_LABELS[r.type] || r.type}</td>
                  <td className="py-3.5 px-4 font-semibold">{r.capacity}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-semibold text-indigo-700">{r.booking_count}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-semibold text-emerald-700">{r.booked_hours} hrs</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/resources/${r.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      View Timeline →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
