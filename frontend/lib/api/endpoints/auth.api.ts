import client from '../client';
import { LoginRequest, AuthResponse } from '../types/auth.types';
import { OrinUser } from '@/stores/useOrinStore';

export const AuthApi = {
  /**
   * Login user with credentials.
   */
  login: (credentials: LoginRequest): Promise<AuthResponse> => 
    client.post('/auth/login', credentials).then(res => res.data.data || res.data),
  
  /**
   * Get the current authenticated user profile.
   */
  me: (): Promise<OrinUser> => 
    client.get('/auth/me').then(res => res.data.data || res.data),

  /**
   * Logout user and invalidate session.
   */
  logout: (): Promise<void> => 
    client.post('/auth/logout').then(() => undefined)
};
