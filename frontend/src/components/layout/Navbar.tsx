'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarCheck,
  Compass,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  UserCheck,
  Zap,
  BookOpen,
} from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout, quickLogin } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiresAuth: true },
    { name: 'Explore Resources', href: '/resources', icon: Compass, requiresAuth: false },
    { name: 'My Bookings', href: '/bookings', icon: CalendarCheck, requiresAuth: true },
    ...(isAdmin
      ? [{ name: 'Admin Hub', href: '/admin', icon: ShieldCheck, requiresAuth: true }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                Space<span className="text-indigo-600">Sync</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Cloud Resource Hub
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.requiresAuth && !isAuthenticated) return null;
              const active = isActive(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Quick Demo Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDemoMenuOpen(!demoMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
              title="Fast switch between demo accounts"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Demo Personas</span>
            </button>

            {demoMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setDemoMenuOpen(false)}
              >
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  1-Click Switch Account
                </div>
                <button
                  onClick={() => {
                    quickLogin('member1');
                    setDemoMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-50 flex items-center justify-between text-slate-700"
                >
                  <div>
                    <div className="font-semibold text-slate-900">Alex Johnson</div>
                    <div className="text-[10px] text-slate-500">member1@spacesync.io</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                    Member
                  </span>
                </button>
                <button
                  onClick={() => {
                    quickLogin('member2');
                    setDemoMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-50 flex items-center justify-between text-slate-700"
                >
                  <div>
                    <div className="font-semibold text-slate-900">Sarah Chen</div>
                    <div className="text-[10px] text-slate-500">member2@spacesync.io</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                    Member
                  </span>
                </button>
                <button
                  onClick={() => {
                    quickLogin('admin');
                    setDemoMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-50 flex items-center justify-between text-slate-700"
                >
                  <div>
                    <div className="font-semibold text-slate-900">SpaceSync Admin</div>
                    <div className="text-[10px] text-slate-500">admin@spacesync.io</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-100 text-indigo-800">
                    Admin
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* User Section or Auth buttons */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-bold text-slate-900">{user.name}</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-600/20 transition-all hover:shadow"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          {navLinks.map((link) => {
            if (link.requiresAuth && !isAuthenticated) return null;
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-100">
            {isAuthenticated && user ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{user.role}</div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold px-3 py-1.5 rounded-lg bg-rose-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
                >
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
