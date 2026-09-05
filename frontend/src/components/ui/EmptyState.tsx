import React, { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="py-16 px-6 text-center border-y border-neutral-200 bg-neutral-50/50 flex flex-col items-center justify-center">
      <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
        RECORD / STATUS EMPTY
      </div>
      <h4 className="text-base font-bold text-charcoal-900 mb-1">{title}</h4>
      <p className="text-xs text-neutral-500 max-w-sm mb-6 leading-relaxed font-sans">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
