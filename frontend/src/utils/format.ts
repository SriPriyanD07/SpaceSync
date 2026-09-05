import { ResourceType, ResourceStatus, BookingStatus } from '../types';

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  meeting_room: 'Meeting Room',
  conference_room: 'Conference Room',
  training_room: 'Training Room',
  projector: 'Projector',
  workstation: 'Workstation',
  lab_equipment: 'Lab Equipment',
  study_space: 'Study Space',
};

export const RESOURCE_STATUS_CONFIG: Record<
  ResourceStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  active: {
    label: 'Available',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  maintenance: {
    label: 'Maintenance',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  inactive: {
    label: 'Inactive',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
};

export const BOOKING_STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatDateOnly(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTimeOnly(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTimeOnly(startIso)} – ${formatTimeOnly(endIso)}`;
}
