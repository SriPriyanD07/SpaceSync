'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  LogOut,
  UserCheck,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout, quickLogin } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const navLinks = [
    { name: 'Workspace', href: '/dashboard', requiresAuth: true },
    { name: 'Resources', href: '/resources', requiresAuth: false },
    { name: 'Bookings', href: '/bookings', requiresAuth: true },
    ...(isAdmin
      ? [
          { name: 'Operations', href: '/admin', requiresAuth: true },
          { name: 'Provisioning', href: '/admin/resources', requiresAuth: true },
          { name: 'Analytics', href: '/admin/analytics', requiresAuth: true },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-canvas/95 backdrop-blur-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand / Logo: Architectural & Typographic */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-baseline gap-2 group">
            <span className="font-mono text-sm font-bold tracking-widest text-charcoal-900 uppercase">
              SPACESYNC
            </span>
            <span className="font-mono text-[10px] text-neutral-400 tracking-wider">
              / 01
            </span>
          </Link>

          {/* Desktop Navigation Links: Minimalist Text with Underline */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              if (link.requiresAuth && !isAuthenticated) return null;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-xs uppercase tracking-wider font-mono py-1 transition-colors relative ${
                    active
                      ? 'text-charcoal-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1.5px] after:bg-charcoal-900'
                      : 'text-neutral-500 hover:text-charcoal-900'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side Actions */}
        <div className="hidden md:flex items-center gap-4">
          {/* Quick Demo Personas (Subtle & Architectural) */}
          <div className="relative">
            <button
              onClick={() => setDemoMenuOpen(!demoMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono tracking-wider uppercase border border-neutral-300 hover:border-charcoal-900 text-charcoal-700 bg-white transition-colors"
            >
              <UserCheck className="w-3 h-3 text-neutral-500" />
              <span>Personas</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {demoMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-52 bg-white border border-charcoal-900 shadow-lg p-1.5 z-50 animate-in fade-in"
                onMouseLeave={() => setDemoMenuOpen(false)}
              >
                <div className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest px-2 py-1 border-b border-neutral-100">
                  Switch Context
                </div>
                <button
                  onClick={() => {
                    quickLogin('member1');
                    setDemoMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-neutral-100 flex items-center justify-between text-charcoal-800"
                >
                  <div>
                    <div className="font-semibold text-charcoal-900">Alex Johnson</div>
                    <div className="font-mono text-[9px] text-neutral-400">member1@spacesync.io</div>
                  </div>
                  <span className="font-mono text-[9px] text-emerald-700">MEMBER</span>
                </button>
                <button
                  onClick={() => {
                    quickLogin('member2');
                    setDemoMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-neutral-100 flex items-center justify-between text-charcoal-800"
                >
                  <div>
                    <div className="font-semibold text-charcoal-900">Sarah Chen</div>
                    <div className="font-mono text-[9px] text-neutral-400">member2@spacesync.io</div>
                  </div>
                  <span className="font-mono text-[9px] text-emerald-700">MEMBER</span>
                </button>
                <button
                  onClick={() => {
                    quickLogin('admin');
                    setDemoMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-neutral-100 flex items-center justify-between text-charcoal-800 border-t border-neutral-100"
                >
                  <div>
                    <div className="font-semibold text-charcoal-900">SpaceSync Admin</div>
                    <div className="font-mono text-[9px] text-neutral-400">admin@spacesync.io</div>
                  </div>
                  <span className="font-mono text-[9px] text-charcoal-900 font-bold">ADMIN</span>
                </button>
              </div>
            )}
          </div>

          {/* User state / Sign in */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-neutral-200">
              <div className="text-right">
                <span className="block text-xs font-semibold text-charcoal-900 leading-none">
                  {user.name}
                </span>
                <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-1 text-neutral-400 hover:text-rose-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-xs font-mono tracking-wider uppercase text-neutral-600 hover:text-charcoal-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-xs font-mono tracking-wider uppercase px-3 py-1.5 bg-charcoal-900 hover:bg-charcoal-800 text-white transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-charcoal-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-canvas px-4 py-4 space-y-3 font-mono text-xs">
          {navLinks.map((link) => {
            if (link.requiresAuth && !isAuthenticated) return null;
            const active = isActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-1.5 uppercase tracking-wider ${
                  active ? 'text-charcoal-900 font-bold' : 'text-neutral-500'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-neutral-200">
            {isAuthenticated && user ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-charcoal-900">{user.name}</div>
                  <div className="text-[10px] text-neutral-400 uppercase">{user.role}</div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-rose-600 text-xs font-semibold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-4">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="font-bold">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
