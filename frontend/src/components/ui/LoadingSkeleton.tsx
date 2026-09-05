import React from 'react';

export function LoadingSkeleton({ className = 'h-6 w-full' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200/80 rounded-lg ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-5 w-32" />
        <LoadingSkeleton className="h-6 w-16 rounded-full" />
      </div>
      <LoadingSkeleton className="h-4 w-48" />
      <LoadingSkeleton className="h-12 w-full" />
      <div className="pt-2 flex justify-between">
        <LoadingSkeleton className="h-4 w-24" />
        <LoadingSkeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}
