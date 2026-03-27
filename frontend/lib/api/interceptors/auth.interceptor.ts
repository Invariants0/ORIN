import { InternalAxiosRequestConfig } from 'axios';

export const authInterceptor = (config: InternalAxiosRequestConfig) => {
  // Better Auth handles sessions via cookies automatically.
  // We do not need to inject a token here.
  return config;
};

export const authErrorInterceptor = (error: any) => {
  return Promise.reject(error);
};
