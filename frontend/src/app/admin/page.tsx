'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AdminStats, UtilizationData } from '../../types';
import { RESOURCE_TYPE_LABELS } from '../../utils/format';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  Award,
  Layers,
  Settings,
  BarChart3,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';

export default function AdminDashboardPage() {
  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
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
      console.error('Failed to load admin stats', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
        </div>
        <LoadingSkeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  // Format volume data for chart
  const chartVolumeData = utilization?.volumeOverTime.map((v) => ({
    date: v.date.substring(5), // 'MM-DD'
    Confirmed: parseInt(v.confirmed, 10),
    Cancelled: parseInt(v.cancelled, 10),
  })) || [];

  // Format resource utilization data for chart
  const chartResourceData = utilization?.resourceUtilization.slice(0, 6).map((r) => ({
    name: r.name.length > 15 ? `${r.name.substring(0, 13)}...` : r.name,
    hours: parseFloat(r.booked_hours),
    bookings: parseInt(r.booking_count, 10),
  })) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Admin Hub Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Organization Utilization & Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Live database-calculated metrics derived from PostgreSQL bookings and resource capacity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/resources"
            className="px-4 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-2 shadow-sm transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Manage Resources
          </Link>
          <Link
            href="/admin/bookings"
            className="px-4 py-2.5 rounded-xl font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs flex items-center gap-2 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" /> Master Bookings
          </Link>
          <Link
            href="/admin/analytics"
            className="px-4 py-2.5 rounded-xl font-semibold bg-white text-slate-900 hover:bg-slate-100 text-xs flex items-center gap-2 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" /> Deep Analytics
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Managed Assets</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats?.resources.total || 0}</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <span>{stats?.resources.active || 0} active & available for booking</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Reservations</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats?.bookings.total || 0}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>{stats?.bookings.today || 0} scheduled today</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Hours Reserved</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {stats?.bookings.totalHoursBooked || 0} <span className="text-sm font-normal text-slate-500">hrs</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Across confirmed bookings
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Cancellation Rate</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {stats?.bookings.cancellationRate || 0}%
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.bookings.cancelled || 0} released reservations
          </div>
        </div>
      </div>

      {/* Most Booked Resource Callout */}
      {stats?.mostBookedResource && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/40 border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Most Booked Organizational Resource
              </div>
              <div className="text-base font-bold text-slate-900">
                {stats.mostBookedResource.name}
              </div>
            </div>
          </div>
          <div className="text-xs font-bold text-amber-900 bg-white/80 px-3.5 py-1.5 rounded-xl border border-amber-200 shrink-0">
            {stats.mostBookedResource.booking_count} Completed Bookings
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Booking Volume Over Time */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Booking Volume Trend</h3>
              <p className="text-xs text-slate-500">Daily reservation activity over past 14 days</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              Live DB Data
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            {chartVolumeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No booking records in timeline
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Confirmed" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cancelled" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Resource Booked Hours Utilization */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Resource Utilization</h3>
              <p className="text-xs text-slate-500">Total hours booked per shared asset</p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Full Breakdown →
            </Link>
          </div>

          <div className="h-64 w-full pt-4">
            {chartResourceData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No utilization records found
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartResourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="h" />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#059669" radius={[0, 4, 4, 0]} name="Hours Booked" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
