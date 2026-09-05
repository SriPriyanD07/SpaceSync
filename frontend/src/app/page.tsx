'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Calendar,
  BarChart3,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Database,
  Cloud,
  Layers,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function LandingPage() {
  const { quickLogin, isAuthenticated, user } = useAuth();

  return (
    <div className="space-y-16 py-6 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold tracking-wide shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Cloud Computing Architecture Assignment • Production SaaS Implementation</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
          Shared resource scheduling. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
            Mathematically zero double-bookings.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          SpaceSync replaces messy spreadsheets, email chains, and WhatsApp groups with a centralized cloud platform for booking meeting rooms, lab benches, workstations, and AV gear.
        </p>

        {/* Action Buttons & 1-Click Demo */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/resources"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 text-base"
          >
            Explore Resources
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!isAuthenticated ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => quickLogin('member1')}
                className="flex-1 sm:flex-none px-5 py-3.5 rounded-xl font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Users className="w-4 h-4 text-emerald-600" />
                Demo as Member
              </button>
              <button
                onClick={() => quickLogin('admin')}
                className="flex-1 sm:flex-none px-5 py-3.5 rounded-xl font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Lock className="w-4 h-4 text-purple-600" />
                Demo as Admin
              </button>
            </div>
          ) : (
            <Link
              href={user?.role === 'admin' ? '/admin' : '/dashboard'}
              className="px-6 py-3.5 rounded-xl font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs transition-colors"
            >
              Go to Your {user?.role === 'admin' ? 'Admin Hub' : 'Member Dashboard'}
            </Link>
          )}
        </div>

        {/* Quick Credentials Info */}
        <div className="text-xs text-slate-500 flex flex-wrap items-center justify-center gap-4 pt-2">
          <span>Demo Accounts:</span>
          <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">admin@spacesync.io / Admin123!</code>
          <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">member1@spacesync.io / Member123!</code>
        </div>
      </section>

      {/* The Problem vs The SpaceSync Solution */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-rose-800 font-bold text-lg">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <h3>The Real-World Problem</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Organizations manage shared rooms and lab equipment via spreadsheets or chat. This causes:
          </p>
          <ul className="space-y-2.5 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">✕</span>
              <span><strong>Double bookings:</strong> Two teams show up to the same conference room at 10:00 AM.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">✕</span>
              <span><strong>Zero visibility:</strong> No one knows if the 4K projector or AI workstation is actually in use.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold">✕</span>
              <span><strong>No utilization insights:</strong> Management has zero data to plan capacity or justify equipment budgets.</span>
            </li>
          </ul>
        </div>

        <div className="p-8 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-lg">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h3>The SpaceSync Architecture</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Engineered with multi-layered concurrency protection and cloud-native resilience:
          </p>
          <ul className="space-y-2.5 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>PostgreSQL Exclusion Constraints:</strong> Enforces physical range exclusion (`tsrange` / `tstzrange`) at database level.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Transaction Row Locks:</strong> Serializes overlapping checks with `FOR UPDATE` queries to prevent race conditions.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Real-Time Analytics:</strong> 100% database-derived KPI metrics, booking volume, and peak hour trends.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Engineered for Modern Organizations
          </h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            From conference rooms and high-spec GPUs to precision chemistry lab benches and quiet study pods.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-900">Visual Availability</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Interactive hourly timeline showing confirmed bookings and free slots with instant conflict warnings.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-900">Double-Booking Guard</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              10:00–12:00 followed by 11:00–13:00 is rejected with 409 Conflict. Back-to-back 12:00–14:00 is seamlessly accepted.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-900">Utilization Analytics</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Total bookings, cancellation rates, most-used resources, volume trends, and peak booking periods.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-900">Role-Based Security</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Strict RBAC. Members manage their own bookings while Admins provision resources and review organization-wide activity.
            </p>
          </div>
        </div>
      </section>

      {/* Cloud Architecture Presentation Banner */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">
              Cloud Architecture Blueprint
            </div>
            <h3 className="text-2xl font-bold tracking-tight">
              Tiered Client-Server Cloud Deployment
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Stateless REST API
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
              <Cloud className="w-4 h-4" /> Cloud Frontend
            </div>
            <p className="text-xs text-slate-300">
              Next.js 14 App Router deployed to Vercel edge network with responsive UI and JWT auth state.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Layers className="w-4 h-4" /> Stateless REST API
            </div>
            <p className="text-xs text-slate-300">
              Node.js + Express deployed to Render/Railway container runtime with Swagger OpenAPI documentation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
              <Database className="w-4 h-4" /> Managed PostgreSQL
            </div>
            <p className="text-xs text-slate-300">
              Cloud PostgreSQL (Neon/Supabase) enforcing `btree_gist` exclusion constraints for mathematical conflict prevention.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
