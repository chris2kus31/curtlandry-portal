// types/auth.ts

export interface User {
  id: number;
  name?: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  google_id?: string;
  avatar_url?: string;
  department?: string;
  job_title?: string;
  hire_date?: string;
  tenure_years?: number;
  is_manager?: boolean;
  has_direct_reports?: boolean; // Actually has people reporting to them
  is_active: boolean;
  manager?: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}

// Response from /portal/auth/me
export interface ProfileResponse {
  success: boolean;
  data: User & {
    roles: string[];
    permissions: string[];
  };
}

// Response from login/OAuth
export interface AuthResponse {
  success?: boolean;
  data?: User & {
    roles: string[];
    permissions: string[];
  };
  user?: User;
  roles?: string[];
  permissions?: string[];
  token?: string;
  refresh_token?: string;
  expires_at?: string;
}

export interface GoogleAuthPayload {
  id_token: string;
}
