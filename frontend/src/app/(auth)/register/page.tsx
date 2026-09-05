'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { UserRole } from '../../../types';
import { ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      await register(name, email, password, role);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] grid grid-cols-1 lg:grid-cols-12 border border-neutral-200 bg-white overflow-hidden animate-in fade-in duration-300">
      {/* Left Column: Brand Statement */}
      <div className="lg:col-span-6 bg-charcoal-950 text-white p-8 sm:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-charcoal-900">
        <div className="space-y-4">
          <div className="font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
            ACCOUNT ONBOARDING // 02
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase leading-none">
            JOIN THE <br />
            <span className="text-neutral-500">PLATFORM.</span>
          </h2>
          <p className="font-sans text-xs sm:text-sm text-neutral-400 max-w-sm leading-relaxed">
            Create an enterprise profile to reserve conference rooms, workstations, and laboratory benches with immediate availability verification.
          </p>
        </div>

        <div className="pt-12 font-mono text-[10px] text-neutral-500 space-y-1 border-t border-charcoal-900">
          <div>DATA INTEGRITY: REFERENTIAL FOREIGN KEYS</div>
          <div>ISOLATION: MEMBER RESERVATION PRIVACY ENFORCED</div>
        </div>
      </div>

      {/* Right Column: Clean Form */}
      <div className="lg:col-span-6 p-8 sm:p-14 flex flex-col justify-center space-y-6 bg-white">
        <div className="space-y-1">
          <div className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
            REGISTRATION
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-charcoal-900">
            Create profile.
          </h3>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 font-mono text-xs text-rose-800">
            [ERROR] {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Elena Rostova"
              className="w-full px-3.5 py-2.5 border border-neutral-300 focus:border-charcoal-900 text-sm focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
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

          <div className="space-y-1">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 border border-neutral-300 focus:border-charcoal-900 text-sm focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600">
              Role Authority
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2.5 border border-neutral-300 focus:border-charcoal-900 text-sm bg-white focus:outline-none transition-colors font-sans"
            >
              <option value="member">Member (Browse & Reserve Shared Assets)</option>
              <option value="admin">Administrator (Resource & Operations Governance)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-charcoal-900 hover:bg-charcoal-800 text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating Account...' : (
              <>
                Register Account <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="text-xs text-neutral-500 font-sans border-t border-neutral-100 pt-4">
          Already registered?{' '}
          <Link href="/login" className="text-charcoal-900 font-semibold underline">
            Sign in to existing account
          </Link>
        </div>
      </div>
    </div>
  );
}
