import { InternalAxiosRequestConfig } from 'axios';

export const authInterceptor = (config: InternalAxiosRequestConfig) => {
  // In a real application, you would type out a way to retrieve the token.
  // E.g., const token = localStorage.getItem('access_token');
  const token = typeof window !== 'undefined' ? localStorage.getItem('orin_auth_token') : null;

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

export const authErrorInterceptor = (error: any) => {
  return Promise.reject(error);
};
