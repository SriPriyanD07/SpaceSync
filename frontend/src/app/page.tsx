'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  X as CloseIcon,
  Shield,
  Layers,
  Database,
  Cpu,
} from 'lucide-react';

// Dynamic import for Three.js spatial floor-plan with zero SSR overhead
const SpatialFloorPlan = dynamic(
  () => import('../components/spatial/SpatialFloorPlan').then((mod) => mod.SpatialFloorPlan),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[380px] sm:h-[460px] bg-charcoal-900 border border-charcoal-800 flex items-center justify-center font-mono text-xs text-charcoal-400">
        LOADING SPATIAL ENGINE...
      </div>
    ),
  }
);

export default function LandingPage() {
  const { quickLogin, isAuthenticated, user } = useAuth();

  return (
    <div className="space-y-24 py-8 animate-in fade-in duration-300">
      {/* 1. Hero Section: Editorial Typography & Statement */}
      <section className="space-y-10 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-neutral-200 pb-4 gap-2">
          <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
            01 / ENTERPRISE PLATFORM SPECIFICATION
          </div>
          <div className="font-mono text-[11px] tracking-widest text-neutral-500 uppercase">
            CLOUD CONCURRENCY ARCHITECTURE • POSTGRESQL ENGINE
          </div>
        </div>

        <div className="space-y-6 max-w-5xl">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tighter text-charcoal-900 uppercase leading-[0.92]">
            SHARED SPACES. <br />
            <span className="text-neutral-400 font-normal">WITHOUT CONFLICT.</span>
          </h1>

          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl font-sans leading-relaxed">
            Reserve conference rooms, compute workstations, precision laboratories, and AV assets through an authoritative scheduling engine backed by mathematical database exclusion.
          </p>
        </div>

        {/* Action Controls & Demo Access */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
          <Link
            href="/resources"
            className="inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-charcoal-900 hover:bg-charcoal-800 text-white font-mono text-xs uppercase tracking-wider transition-colors"
          >
            Explore Resources <ArrowRight className="w-4 h-4" />
          </Link>

          {!isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => quickLogin('member1')}
                className="px-5 py-3.5 border border-neutral-300 hover:border-charcoal-900 bg-white text-charcoal-800 font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
              >
                <span>Demo Member (Alex)</span>
              </button>
              <button
                onClick={() => quickLogin('admin')}
                className="px-5 py-3.5 border border-neutral-300 hover:border-charcoal-900 bg-white text-charcoal-800 font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
              >
                <span>Demo Administrator</span>
              </button>
            </div>
          ) : (
            <Link
              href={user?.role === 'admin' ? '/admin' : '/dashboard'}
              className="inline-flex items-center gap-2 px-6 py-3.5 border border-charcoal-900 bg-white font-mono text-xs uppercase tracking-wider hover:bg-neutral-50 transition-colors"
            >
              Enter {user?.role === 'admin' ? 'Operations Console' : 'Workspace'} →
            </Link>
          )}
        </div>
      </section>

      {/* 2. Interactive Spatial Floor-Plan Model */}
      <section className="space-y-3">
        <div className="flex justify-between items-baseline font-mono text-[11px] text-neutral-400 uppercase tracking-widest">
          <span>SPATIAL MODEL // FLOOR 03</span>
          <span>THREE.JS • INTERACTIVE ROTATION</span>
        </div>
        <SpatialFloorPlan />
        <div className="flex flex-col sm:flex-row justify-between text-xs font-mono text-neutral-400 pt-2 border-b border-neutral-200 pb-4 gap-2">
          <span>REAL-TIME STATUS SYNC VIA REST APIS</span>
          <span>MATHEMATICAL RANGE EXCLUSION ACTIVE</span>
        </div>
      </section>

      {/* 3. The Problem Statement: Horizontal Editorial Division */}
      <section className="space-y-6 pt-4">
        <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
          02 / THE BOTTLENECK
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-neutral-200 pt-8">
          <div className="lg:col-span-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal-900 uppercase">
              INFORMAL SCHEDULING ALWAYS FAILS AT SCALE.
            </h2>
          </div>
          <div className="lg:col-span-8 space-y-6 font-sans text-neutral-600 text-sm leading-relaxed">
            <p>
              When organizations manage shared facilities through chat threads, spreadsheets, and calendar invites, operational friction compounds rapidly. Double bookings lock concurrent teams out of critical meetings, expensive compute assets sit idle without visibility, and administration lacks the empirical data required for space planning.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-neutral-100 font-mono text-xs">
              <div className="space-y-1">
                <div className="text-rose-700 font-bold">DOUBLE BOOKINGS</div>
                <div className="text-neutral-500 font-sans text-xs">
                  Simultaneous reservations accepted due to non-transactional database writes.
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-amber-700 font-bold">ZERO OCCUPANCY AUDIT</div>
                <div className="text-neutral-500 font-sans text-xs">
                  No single source of truth for whether high-spec gear is currently in use.
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-charcoal-900 font-bold">BLIND CAPACITY EXPANSION</div>
                <div className="text-neutral-500 font-sans text-xs">
                  Zero metrics on utilization hours, peak periods, or asset class demand.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works: Minimalist Numbered Process */}
      <section className="space-y-6">
        <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
          03 / EXECUTION WORKFLOW
        </div>
        <div className="border-t border-neutral-200 divide-y divide-neutral-200">
          {[
            {
              step: '01',
              title: 'DISCOVER',
              description: 'Filter shared assets across meeting rooms, workstations, precision lab benches, and AV setups by capacity and location.',
            },
            {
              step: '02',
              title: 'AUDIT AVAILABILITY',
              description: 'Inspect full 08:00 to 20:00 visual hourly timelines. Active sessions and vacant intervals are rendered without ambiguity.',
            },
            {
              step: '03',
              title: 'RESERVE WITH ZERO-CONFLICT GUARANTEE',
              description: 'Submissions are verified against row locks in a serialized PostgreSQL transaction and protected by range exclusion constraints.',
            },
            {
              step: '04',
              title: 'MANAGE & RELEASE',
              description: 'Members manage their active sessions. Slot cancellations automatically release time ranges back into the pool instantaneously.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline"
            >
              <div className="md:col-span-2 font-mono text-sm text-neutral-400 font-bold">
                {item.step}
              </div>
              <div className="md:col-span-4 font-mono text-sm font-bold text-charcoal-900 tracking-wider">
                {item.title}
              </div>
              <div className="md:col-span-6 font-sans text-xs text-neutral-600 leading-relaxed">
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Resource Taxonomy: High-Density Text Directory */}
      <section className="space-y-6">
        <div className="flex justify-between items-baseline border-b border-neutral-200 pb-4">
          <div className="font-mono text-[11px] tracking-widest text-neutral-400 uppercase">
            04 / RESOURCE CLASSIFICATION
          </div>
          <Link
            href="/resources"
            className="font-mono text-xs uppercase tracking-wider text-charcoal-900 hover:underline flex items-center gap-1"
          >
            Full Directory <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-neutral-200">
          {[
            { name: 'Conference Room Alpha', type: 'Conference Room', cap: '20 Persons', loc: 'Building A, Floor 3', status: 'AVAILABLE' },
            { name: 'Meeting Room Beta', type: 'Meeting Room', cap: '6 Persons', loc: 'Building A, Floor 2', status: 'AVAILABLE' },
            { name: 'Training Room Gamma', type: 'Training Room', cap: '35 Persons', loc: 'Building B, Floor 1', status: 'AVAILABLE' },
            { name: 'AI Workstation 01', type: 'Workstation', cap: '1 Compute Node', loc: 'Innovation Lab - Desk 14', status: 'AVAILABLE' },
            { name: 'Research Lab Bench 01', type: 'Lab Equipment', cap: '4 Researchers', loc: 'Science Wing 102', status: 'AVAILABLE' },
            { name: '4K Cinema Projector 01', type: 'Projector', cap: '1 Unit', loc: 'Locker #4', status: 'AVAILABLE' },
          ].map((r) => (
            <div
              key={r.name}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2 hover:bg-neutral-50 px-2 transition-colors"
            >
              <div className="sm:w-1/3 font-bold text-charcoal-900 text-sm font-sans">{r.name}</div>
              <div className="sm:w-1/4 text-neutral-500 uppercase">{r.type}</div>
              <div className="sm:w-1/4 text-neutral-400">{r.loc} • {r.cap}</div>
              <div className="sm:w-1/6 sm:text-right text-emerald-700 font-bold">{r.status}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Concurrency Centerpiece Demonstration Proof */}
      <section className="bg-charcoal-900 text-white p-8 sm:p-12 space-y-8">
        <div className="space-y-2">
          <div className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
            05 / THE CONCURRENCY CENTERPIECE
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight uppercase">
            INTERVAL OVERLAP MATHEMATICAL PROOF
          </h2>
          <p className="font-sans text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
            SpaceSync models intervals as semi-open sets [A_start, A_end). Collision detection is enforced by both transactional row locks and PostgreSQL range exclusion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-charcoal-800 pt-8 font-mono text-xs">
          {/* Overlapping Collision Case */}
          <div className="space-y-4 border border-charcoal-800 p-6 bg-charcoal-950/60">
            <div className="text-rose-400 font-bold uppercase flex items-center justify-between">
              <span>TEST CASE: OVERLAPPING CONFLICT</span>
              <CloseIcon className="w-4 h-4 text-rose-500" />
            </div>
            <div className="space-y-2 text-neutral-300">
              <div className="p-2 bg-charcoal-900 border border-charcoal-800">
                <span className="text-neutral-500">BOOKING_A:</span> 10:00 → 12:00 [CONFIRMED]
              </div>
              <div className="p-2 bg-rose-950/30 border border-rose-900/60 text-rose-300">
                <span className="text-rose-400">ATTEMPTED_B:</span> 11:00 → 13:00 [OVERLAP DETECTED]
              </div>
            </div>
            <div className="text-[11px] text-neutral-400 leading-relaxed font-sans">
              Condition $(10:00 &lt; 13:00) \land (12:00 &gt; 11:00)$ is TRUE. Both application lock and PostgreSQL exclusion constraint reject write with <strong>409 Conflict</strong>.
            </div>
          </div>

          {/* Back-to-Back Success Case */}
          <div className="space-y-4 border border-charcoal-800 p-6 bg-charcoal-950/60">
            <div className="text-emerald-400 font-bold uppercase flex items-center justify-between">
              <span>TEST CASE: BACK-TO-BACK ADJACENCY</span>
              <Check className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="space-y-2 text-neutral-300">
              <div className="p-2 bg-charcoal-900 border border-charcoal-800">
                <span className="text-neutral-500">BOOKING_A:</span> 10:00 → 12:00 [CONFIRMED]
              </div>
              <div className="p-2 bg-emerald-950/30 border border-emerald-900/60 text-emerald-300">
                <span className="text-emerald-400">ATTEMPTED_B:</span> 12:00 → 14:00 [EXACT BOUNDARY TOUCH]
              </div>
            </div>
            <div className="text-[11px] text-neutral-400 leading-relaxed font-sans">
              Condition $(12:00 &gt; 12:00)$ is FALSE. Zero interval intersection. The system immediately confirms the second reservation with <strong>201 Created</strong>.
            </div>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action: Full-Width Editorial Banner */}
      <section className="border-t border-neutral-200 pt-16 pb-8 space-y-6 text-center max-w-3xl mx-auto">
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight uppercase text-charcoal-900">
          ONE SYSTEM. EVERY SHARED SPACE.
        </h2>
        <p className="text-neutral-600 text-sm font-sans leading-relaxed">
          Experience the production deployment running with live PostgreSQL persistence, OpenAPI documentation, and role-based access.
        </p>
        <div className="pt-2 flex justify-center gap-4">
          <Link
            href="/resources"
            className="px-8 py-3.5 bg-charcoal-900 hover:bg-charcoal-800 text-white font-mono text-xs uppercase tracking-wider transition-colors"
          >
            Launch Resource Directory →
          </Link>
        </div>
      </section>
    </div>
  );
}
