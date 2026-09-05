import React from 'react';
import { Database, Cloud, ShieldCheck, Zap, Terminal } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <span>SpaceSync Platform</span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              High-concurrency shared resource booking and utilization intelligence platform.
              Guarantees zero double-bookings with PostgreSQL exclusion constraints and row locking.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 text-xs font-mono">
              <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
                <Cloud className="w-3 h-3 text-indigo-400" /> Next.js + Vercel
              </span>
              <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-emerald-400" /> Express + Render
              </span>
              <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
                <Database className="w-3 h-3 text-blue-400" /> PostgreSQL + btree_gist
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
              Platform Features
            </h4>
            <ul className="space-y-2 text-sm">
              <li>Zero Double-Booking Engine</li>
              <li>Visual Timeline Availability</li>
              <li>Resource Discovery & Filters</li>
              <li>Role-Based Authorization</li>
              <li>Real-time Utilization KPIs</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
              Cloud Verification
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="http://localhost:5000/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  Interactive Swagger Docs →
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:5000/api/health"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  System Health Endpoint →
                </a>
              </li>
              <li className="text-xs text-slate-500 pt-2">
                PostgreSQL Serialized Transactions & Exclusion Ranges
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div>
            © {new Date().getFullYear()} SpaceSync. Built for Cloud Computing Architecture Assignment.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Zero-Conflict Guarantee
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
