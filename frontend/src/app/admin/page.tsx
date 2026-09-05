'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AdminStats, UtilizationData } from '../../types';
import { RESOURCE_TYPE_LABELS } from '../../utils/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ArrowUpRight, Plus, Settings } from 'lucide-react';

export default function AdminDashboardPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [utilization, setUtilization] = useState<UtilizationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      if (!isAdmin) {
        router.push('/dashboard');
        return;
      }
      fetchAdminData();
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsData, utilData] = await Promise.all([
        api.get<AdminStats>('/admin/statistics'),
        api.get<UtilizationData>('/admin/utilization'),
      ]);
      setStats(statsData);
      setUtilization(utilData);
    } catch (err) {
      console.error('Failed to load admin operations data', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-8 py-8">
        <LoadingSkeleton className="h-10 w-64" />
        <LoadingSkeleton className="h-48 w-full" />
        <LoadingSkeleton className="h-72 w-full" />
      </div>
    );
  }

  // Calculate overall utilization percentage
  const totalRes = stats?.resources.total || 1;
  const activeRes = stats?.resources.active || 1;
  const utilPercent = Math.round((activeRes / totalRes) * 100);

  // Format booking activity chart data
  const volumeData = (utilization?.volumeOverTime || []).map((v) => ({
    date: v.date.substring(5),
    Confirmed: parseInt(v.confirmed, 10),
    Cancelled: parseInt(v.cancelled, 10),
  }));

  // Peak hours data
  const peakData = (utilization?.peakHours || []).map((p) => ({
    hour: `${String(p.hour).padStart(2, '0')}`,
    count: parseInt(p.count, 10),
  }));

  return (
    <div className="space-y-16 py-6 animate-in fade-in duration-300">
      {/* 1. Operations Header */}
      <section className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-neutral-200 pb-8 gap-4">
        <div className="space-y-2">
          <div className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
            OPERATIONS CONSOLE // EXECUTIVE CONTROL
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-charcoal-900 uppercase">
            SPACE OPERATIONS.
          </h1>
          <p className="text-neutral-500 font-sans text-sm">
            Live database-derived occupancy, scheduling throughput, and capacity utilization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start font-mono text-xs">
          <Link
            href="/admin/resources"
            className="px-4 py-2 border border-neutral-300 hover:border-charcoal-900 text-charcoal-800 transition-colors flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" /> Provisioning
          </Link>
          <Link
            href="/admin/bookings"
            className="px-4 py-2 border border-neutral-300 hover:border-charcoal-900 text-charcoal-800 transition-colors"
          >
            Master Bookings
          </Link>
          <Link
            href="/admin/analytics"
            className="px-4 py-2 bg-charcoal-900 hover:bg-charcoal-800 text-white transition-colors"
          >
            Analytics Report →
          </Link>
        </div>
      </section>

      {/* 2. High-Impact Utilization Indicator (NO CARDS) */}
      <section className="border-b border-neutral-200 pb-12 space-y-8">
        <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
          CAPACITY UTILIZATION INDEX
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-baseline">
          <div className="md:col-span-5 space-y-2">
            <div className="text-7xl sm:text-9xl font-extrabold tracking-tighter text-charcoal-900 leading-none">
              {utilPercent}%
            </div>
            <div className="font-mono text-xs uppercase text-neutral-500 tracking-wider">
              ACTIVE RESOURCE OPERATIONAL READINESS
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-6 font-mono text-xs pt-4 md:pt-0">
            <div className="border-l border-neutral-200 pl-4 space-y-1">
              <div className="text-[10px] text-neutral-400 uppercase">MANAGED ASSETS</div>
              <div className="text-2xl font-bold text-charcoal-900">{stats?.resources.total || 0}</div>
              <div className="text-[10px] text-emerald-700 font-bold">{stats?.resources.active || 0} ACTIVE</div>
            </div>

            <div className="border-l border-neutral-200 pl-4 space-y-1">
              <div className="text-[10px] text-neutral-400 uppercase">RESERVATIONS</div>
              <div className="text-2xl font-bold text-charcoal-900">{stats?.bookings.total || 0}</div>
              <div className="text-[10px] text-neutral-500">{stats?.bookings.today || 0} TODAY</div>
            </div>

            <div className="border-l border-neutral-200 pl-4 space-y-1">
              <div className="text-[10px] text-neutral-400 uppercase">HOURS BOOKED</div>
              <div className="text-2xl font-bold text-charcoal-900">{stats?.bookings.totalHoursBooked || 0}</div>
              <div className="text-[10px] text-neutral-500">CONFIRMED TIME</div>
            </div>

            <div className="border-l border-neutral-200 pl-4 space-y-1">
              <div className="text-[10px] text-neutral-400 uppercase">CANCELLATIONS</div>
              <div className="text-2xl font-bold text-charcoal-900">{stats?.bookings.cancellationRate || 0}%</div>
              <div className="text-[10px] text-neutral-500">{stats?.bookings.cancelled || 0} RELEASED</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Full-Width Booking Activity Chart */}
      <section className="space-y-4">
        <div className="flex justify-between items-baseline border-b border-neutral-200 pb-3">
          <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
            BOOKING ACTIVITY // DAILY VOLUME
          </div>
          <span className="font-mono text-[10px] text-neutral-400">14-DAY WINDOW</span>
        </div>

        <div className="border border-neutral-200 bg-white p-6">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#737373" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#737373" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="Confirmed" fill="#18181b" radius={0} />
                <Bar dataKey="Cancelled" fill="#a1a1aa" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 4. Resource Performance Ranking (Progress Bar Meters) */}
      <section className="space-y-4">
        <div className="flex justify-between items-baseline border-b border-neutral-200 pb-3">
          <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
            RESOURCE PERFORMANCE // OCCUPANCY HOURS
          </div>
          <Link
            href="/admin/resources"
            className="font-mono text-xs text-charcoal-900 hover:underline uppercase tracking-wider flex items-center gap-1"
          >
            Manage Assets <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-neutral-200 border-t border-neutral-200">
          {(utilization?.resourceUtilization || []).map((r) => {
            const hours = parseFloat(r.booked_hours) || 0;
            const percentage = Math.min(100, Math.round((hours / 24) * 100));

            return (
              <div key={r.id} className="py-4 space-y-2 font-mono text-xs">
                <div className="flex justify-between items-baseline">
                  <div className="font-bold text-charcoal-900 font-sans text-sm">{r.name}</div>
                  <div className="text-neutral-500">
                    <span className="font-bold text-charcoal-900">{r.booked_hours} hrs</span> ({r.booking_count} bookings)
                  </div>
                </div>

                {/* Minimalist Proportional Fill Meter */}
                <div className="w-full h-2 bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full bg-charcoal-900 transition-all duration-500"
                    style={{ width: `${Math.max(5, percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Peak Hours Distribution Heatmap */}
      <section className="space-y-4">
        <div className="flex justify-between items-baseline border-b border-neutral-200 pb-3">
          <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
            PEAK BOOKING PERIODS // HOURLY DENSITY
          </div>
          <span className="font-mono text-[10px] text-neutral-400">POSTGRESQL EXTRACT(HOUR)</span>
        </div>

        <div className="border border-neutral-200 bg-white p-6">
          <div className="grid grid-cols-12 gap-2 text-center font-mono text-[11px]">
            {peakData.map((p) => {
              const count = p.count;
              const intensity = count > 2 ? 'bg-charcoal-900 text-white' : count > 0 ? 'bg-neutral-300 text-charcoal-900' : 'bg-neutral-100 text-neutral-400';
              return (
                <div key={p.hour} className="space-y-1">
                  <div className={`py-4 font-bold ${intensity}`}>
                    {count}
                  </div>
                  <div className="text-[10px] text-neutral-400">{p.hour}:00</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
