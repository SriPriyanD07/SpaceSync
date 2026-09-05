import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white mt-auto font-mono text-xs text-neutral-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-neutral-100">
          <div className="md:col-span-2 space-y-2">
            <div className="text-charcoal-900 font-bold tracking-wider uppercase text-sm">
              SPACESYNC / ENTERPRISE RESOURCE SCHEDULING
            </div>
            <p className="text-neutral-500 text-xs leading-relaxed max-w-md font-sans">
              Centralized platform for booking and managing shared rooms, compute workstations,
              laboratory instruments, and audio-visual equipment with zero double-bookings.
            </p>
            <div className="pt-2 text-[10px] text-neutral-400 space-y-0.5">
              <div>ENGINE: NODE.JS + EXPRESS (STATELESS REST)</div>
              <div>PERSISTENCE: MANAGED POSTGRESQL + BTREE_GIST</div>
              <div>DEPLOYMENT: NEXT.JS ON VERCEL EDGE • RENDER CONTAINER</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-charcoal-900 font-semibold tracking-wider uppercase text-[11px]">
              Platform Architecture
            </div>
            <ul className="space-y-1.5 text-neutral-500 text-xs font-sans">
              <li>Dual-Layer Concurrency Control</li>
              <li>PostgreSQL Exclusion Constraints</li>
              <li>Visual 24H Timeline Scheduling</li>
              <li>Role-Based Access Control (RBAC)</li>
              <li>Database-Derived Utilization KPIs</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-charcoal-900 font-semibold tracking-wider uppercase text-[11px]">
              System Verification
            </div>
            <ul className="space-y-1.5 text-xs">
              <li>
                <a
                  href="http://localhost:5000/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-700 hover:text-charcoal-900 transition-colors underline"
                >
                  Interactive Swagger Docs [3.0] →
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:5000/api/health"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 transition-colors underline"
                >
                  System Health Endpoint →
                </a>
              </li>
              <li className="text-[10px] text-neutral-400 pt-2 font-mono">
                CONCURRENCY: EXCLUDE USING GIST
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-neutral-400">
          <div>
            © {new Date().getFullYear()} SpaceSync Platform. Built for Cloud Computing Architecture.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-700 font-semibold">● POSTGRESQL CONSTRAINTS ACTIVE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
