import { AxiosError, AxiosResponse } from 'axios';
import { ApiError } from '../types';

export const errorInterceptor = (error: AxiosError): Promise<never> => {
  let normalizedError: ApiError = {
    message: 'An unexpected error occurred. Please try again later.',
  };

  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as any;

    normalizedError = {
      message: data?.message || error.message,
      status: status,
      code: data?.code,
      details: data?.details,
    };

    // Generic handling for 401 Unauthorized
    if (status === 401) {
      console.warn('[API Error] Unauthorized - redirecting to login or clearing session.');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth'; 
      }
    }

  } else if (error.request) {
    // The request was made but no response was received
    normalizedError.message = 'No response received from the server. Check your network connection.';
  } else {
    // Something happened in setting up the request
    normalizedError.message = error.message;
  }

  console.error('[API Error Interceptor]:', normalizedError);
  return Promise.reject(normalizedError);
};

export const responseInterceptor = (response: AxiosResponse) => {
  // Can unwrap or log the response here. 
  // We'll return the response as is for now, let the API methods unwrap it.
  return response;
};
