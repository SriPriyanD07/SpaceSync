import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'danger' | 'warning' | 'dark';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variantStyles = {
    neutral: 'border-neutral-300 text-neutral-600 bg-neutral-50',
    success: 'border-emerald-300 text-emerald-800 bg-emerald-50/60',
    danger: 'border-rose-300 text-rose-800 bg-rose-50/60',
    warning: 'border-amber-300 text-amber-800 bg-amber-50/60',
    dark: 'border-charcoal-800 text-charcoal-900 bg-neutral-100',
  };

  return (
    <span
      className={`inline-flex items-center border font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
