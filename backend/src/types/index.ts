import { Request } from 'express';

export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
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
  // Joined fields
  resource_name?: string;
  resource_type?: string;
  resource_location?: string;
  user_name?: string;
  user_email?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
