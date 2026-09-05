import React from 'react';

export function LoadingSkeleton({ className = 'h-5 w-full' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-neutral-200/60 ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="border-b border-neutral-200 py-6 space-y-3">
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-4 w-40" />
        <LoadingSkeleton className="h-4 w-16" />
      </div>
      <LoadingSkeleton className="h-3 w-64" />
      <LoadingSkeleton className="h-8 w-full" />
    </div>
  );
}
