export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export type ResourceType =
  | 'meeting_room'
  | 'conference_room'
  | 'training_room'
  | 'projector'
  | 'workstation'
  | 'lab_equipment'
  | 'study_space';

export type ResourceStatus = 'active' | 'maintenance' | 'inactive';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  capacity: number;
  description: string;
  status: ResourceStatus;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  resource_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  purpose: string;
  created_at: string;
  updated_at: string;
  resource_name?: string;
  resource_type?: ResourceType;
  resource_location?: string;
  user_name?: string;
  user_email?: string;
}

export interface AvailabilitySlot {
  hour: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  booking: {
    id: string;
    userName: string;
    purpose: string;
    startTime: string;
    endTime: string;
  } | null;
}

export interface ResourceAvailabilityResponse {
  resource: Resource;
  date: string;
  slots: AvailabilitySlot[];
  confirmedBookings: Booking[];
}

export interface AdminStats {
  resources: {
    total: number;
    active: number;
    maintenance: number;
    inactive: number;
  };
  bookings: {
    total: number;
    confirmed: number;
    cancelled: number;
    today: number;
    upcoming: number;
    cancellationRate: number;
    totalHoursBooked: number;
  };
  mostBookedResource: {
    id: string;
    name: string;
    type: ResourceType;
    booking_count: string;
  } | null;
}

export interface UtilizationData {
  volumeOverTime: Array<{
    date: string;
    total: string;
    confirmed: string;
    cancelled: string;
  }>;
  resourceUtilization: Array<{
    id: string;
    name: string;
    type: ResourceType;
    capacity: number;
    booking_count: string;
    booked_hours: string;
  }>;
  byResourceType: Array<{
    type: ResourceType;
    booking_count: string;
  }>;
  peakHours: Array<{
    hour: number;
    count: string;
  }>;
}
