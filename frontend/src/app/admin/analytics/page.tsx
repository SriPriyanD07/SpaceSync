'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { UtilizationData } from '../../../types';
import { RESOURCE_TYPE_LABELS } from '../../../utils/format';
import {
  ChevronLeft,
  ArrowUpRight,
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
      <div className="space-y-8 max-w-7xl mx-auto">
        <LoadingSkeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <LoadingSkeleton className="h-80" />
          <LoadingSkeleton className="h-80" />
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

  // Aggregated KPIs
  const totalBookedHours = (data?.resourceUtilization || []).reduce(
    (acc, r) => acc + (parseFloat(r.booked_hours as any) || 0),
    0
  );

  const totalBookingsCount = (data?.resourceUtilization || []).reduce(
    (acc, r) => acc + (parseInt(r.booking_count as any, 10) || 0),
    0
  );

  const highestHour = (data?.peakHours || []).reduce(
    (max, p) => (parseInt(p.count, 10) > parseInt(max.count || '0', 10) ? p : max),
    { hour: 0, count: '0' }
  );

  const topCategory = (data?.byResourceType || []).reduce(
    (max, t) => (parseInt(t.booking_count, 10) > parseInt(max.booking_count || '0', 10) ? t : max),
    { type: 'None', booking_count: '0' }
  );

  const maxHours = Math.max(
    1,
    ...(data?.resourceUtilization || []).map((r) => parseFloat(r.booked_hours as any) || 0)
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-300 max-w-7xl mx-auto pb-16">
      {/* Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-neutral-200 pb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400 uppercase tracking-widest mb-3">
            <Link href="/admin" className="hover:text-neutral-900 transition-colors flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> ADMIN OPERATIONS
            </Link>
            <span>/</span>
            <span className="text-neutral-900">INTELLIGENCE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-neutral-950 font-serif">
            Operational Intelligence
          </h1>
          <p className="text-neutral-500 text-sm mt-1 max-w-2xl font-sans">
            Audited occupancy metrics, hourly congestion distributions, and resource utilization hours calculated directly from relational storage.
          </p>
        </div>

        <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider text-right">
          <div>ENGINE: LIVE_CALCULATED</div>
          <div className="text-neutral-950">ZERO_CACHE_AUDIT</div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-neutral-200 bg-white">
        <div className="p-6 border-r border-b lg:border-b-0 border-neutral-200">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Cumulative Reserved Hours</div>
          <div className="text-3xl font-light text-neutral-950 mt-1 font-mono">
            {totalBookedHours.toFixed(1)} <span className="text-sm font-sans text-neutral-400">hrs</span>
          </div>
          <div className="text-xs text-neutral-500 mt-1">Across all facilities</div>
        </div>
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-neutral-200">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Confirmed Allocations</div>
          <div className="text-3xl font-light text-neutral-950 mt-1 font-mono">{totalBookingsCount}</div>
          <div className="text-xs text-neutral-500 mt-1">Distinct reserved sessions</div>
        </div>
        <div className="p-6 border-r border-neutral-200">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Peak Density Slot</div>
          <div className="text-3xl font-light text-neutral-950 mt-1 font-mono">
            {highestHour.count !== '0' ? `${String(highestHour.hour).padStart(2, '0')}:00` : '—'}
          </div>
          <div className="text-xs text-neutral-500 mt-1">{highestHour.count} sessions clustered</div>
        </div>
        <div className="p-6">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Dominant Asset Class</div>
          <div className="text-xl font-light text-neutral-950 mt-2 truncate font-sans">
            {(RESOURCE_TYPE_LABELS as Record<string, string>)[topCategory.type] || topCategory.type}
          </div>
          <div className="text-xs text-neutral-500 mt-1">{topCategory.booking_count} total reservations</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Peak Hours Chart */}
        <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-neutral-950">
                01 / Hourly Congestion Distribution
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Session concentration indexed across 24 hours
              </p>
            </div>
            <span className="font-mono text-[10px] text-neutral-400 uppercase">EXTRACT(HOUR)</span>
          </div>

          <div className="h-64 w-full">
            {peakChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center font-mono text-xs text-neutral-400">
                NO HOURLY LOGS RECORDED
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakChartData}>
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: '#737373', fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#e5e5e5' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#737373', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="Bookings" fill="#18181b" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bookings By Resource Type */}
        <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-neutral-950">
                02 / Asset Class Occupancy Volume
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Allocation balance between rooms, pods, and hardware
              </p>
            </div>
            <span className="font-mono text-[10px] text-neutral-400 uppercase">GROUP BY TYPE</span>
          </div>

          <div className="h-64 w-full">
            {typeChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center font-mono text-xs text-neutral-400">
                NO CLASSIFICATION DATA
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#737373', fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#e5e5e5' }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="type"
                    type="category"
                    width={110}
                    tick={{ fontSize: 10, fill: '#737373', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="Bookings" fill="#27272a" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Utilization Breakdown Table */}
      <div className="border border-neutral-200 bg-white overflow-hidden space-y-4">
        <div className="p-6 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-neutral-950">
              03 / Per-Resource Utilization Ledger
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Cumulative session count and total occupied duration per asset
            </p>
          </div>
          <span className="font-mono text-[10px] text-neutral-400 uppercase">
            {(data?.resourceUtilization || []).length} ASSETS MONITORED
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              <tr>
                <th className="py-3 px-4 w-12 text-neutral-400">REF</th>
                <th className="py-3 px-4 font-normal">FACILITY DESIGNATION</th>
                <th className="py-3 px-4 font-normal">CLASSIFICATION</th>
                <th className="py-3 px-4 font-normal text-right">CAPACITY</th>
                <th className="py-3 px-4 font-normal text-right">TOTAL SESSIONS</th>
                <th className="py-3 px-4 font-normal">CUMULATIVE OCCUPANCY</th>
                <th className="py-3 px-4 font-normal text-right">SPEC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(data?.resourceUtilization || []).map((r, idx) => {
                const hours = parseFloat(r.booked_hours as any) || 0;
                const percentage = Math.min(100, Math.round((hours / maxHours) * 100));

                return (
                  <tr key={r.id} className="hover:bg-neutral-50/60 transition-colors group">
                    <td className="py-4 px-4 font-mono text-[11px] text-neutral-400">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-4 px-4 font-medium text-neutral-950">{r.name}</td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-[11px] text-neutral-600 uppercase">
                        {RESOURCE_TYPE_LABELS[r.type] || r.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-[11px] text-neutral-600">
                      {r.capacity} pax
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-[11px] text-neutral-950">
                      {r.booking_count}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-neutral-950 min-w-16">
                          {hours.toFixed(1)} hrs
                        </span>
                        <div className="flex-1 max-w-36 h-1.5 bg-neutral-100 overflow-hidden">
                          <div
                            className="h-full bg-neutral-900 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        href={`/resources/${r.id}`}
                        className="font-mono text-[11px] text-neutral-900 hover:text-neutral-600 inline-flex items-center gap-0.5"
                      >
                        TIMELINE <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

