import { OrinUser } from '@/stores/useOrinStore';

export interface LoginRequest {
  email: string;
  password?: string;
  provider?: 'google' | 'email';
}

export interface AuthResponse {
  user: OrinUser;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}
