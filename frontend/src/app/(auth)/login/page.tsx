'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ArrowRight, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] grid grid-cols-1 lg:grid-cols-12 border border-neutral-200 bg-white overflow-hidden animate-in fade-in duration-300">
      {/* Left Column: Brand Statement & Spatial Identity */}
      <div className="lg:col-span-6 bg-charcoal-950 text-white p-8 sm:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-charcoal-900">
        <div className="space-y-4">
          <div className="font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
            AUTHENTICATION PROTOCOL // 01
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase leading-none">
            ACCESS YOUR <br />
            <span className="text-neutral-500">WORKSPACE.</span>
          </h2>
          <p className="font-sans text-xs sm:text-sm text-neutral-400 max-w-sm leading-relaxed">
            Centralized reservation management across conference rooms, laboratories, and compute clusters.
          </p>
        </div>

        <div className="pt-12 font-mono text-[10px] text-neutral-500 space-y-1 border-t border-charcoal-900">
          <div>TOPOLOGY: 7 ACTIVE PHYSICAL ZONES</div>
          <div>SECURITY: STATELESS JWT • BCRYPT PASSWORDS</div>
          <div>DOUBLE-BOOKING: POSTGRESQL BTREE_GIST ENFORCED</div>
        </div>
      </div>

      {/* Right Column: Clean Editorial Form */}
      <div className="lg:col-span-6 p-8 sm:p-14 flex flex-col justify-center space-y-8 bg-white">
        <div className="space-y-1">
          <div className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
            SIGN IN
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-charcoal-900">
            Welcome back.
          </h3>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 font-mono text-xs text-rose-800">
            [ERROR] {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@organization.com"
              className="w-full px-3.5 py-2.5 border border-neutral-300 focus:border-charcoal-900 text-sm focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-neutral-300 focus:border-charcoal-900 text-sm focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-charcoal-900 hover:bg-charcoal-800 text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : (
              <>
                Sign In <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Demo Section */}
        <div className="pt-4 border-t border-neutral-200 space-y-3">
          <div className="font-mono text-[10px] tracking-wider text-neutral-400 uppercase">
            1-Click Demo Evaluation Personas
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickLogin('member1')}
              className="px-3 py-2 border border-neutral-300 hover:border-charcoal-900 font-mono text-[11px] text-charcoal-800 text-left transition-colors flex items-center justify-between"
            >
              <span>Alex (Member)</span>
              <span className="text-[9px] text-emerald-700">DEMO</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin')}
              className="px-3 py-2 border border-neutral-300 hover:border-charcoal-900 font-mono text-[11px] text-charcoal-800 text-left transition-colors flex items-center justify-between"
            >
              <span>Admin Console</span>
              <span className="text-[9px] text-charcoal-900 font-bold">ADMIN</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-neutral-500 font-sans">
          Need an account?{' '}
          <Link href="/register" className="text-charcoal-900 font-semibold underline">
            Register new member
          </Link>
        </div>
      </div>
    </div>
  );
}
