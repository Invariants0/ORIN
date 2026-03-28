import { AxiosError, AxiosResponse } from 'axios';
import { ApiError } from '../types';

const getErrorMessage = (error: AxiosError, data: any) => {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof data?.error?.message === 'string' && data.error.message.trim()) {
    return data.error.message;
  }

  return error.message || 'An unexpected error occurred. Please try again later.';
};

export const errorInterceptor = (error: AxiosError): Promise<never> => {
  let normalizedError: ApiError = {
    message: 'An unexpected error occurred. Please try again later.',
  };

  const isCanceledRequest =
    error.code === 'ERR_CANCELED' ||
    error.message?.toLowerCase().includes('canceled');

  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as any;

    normalizedError = {
      message: getErrorMessage(error, data),
      status: status,
      code: data?.code || data?.error?.code,
      details: data?.details || data?.error?.details,
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
    normalizedError.message = isCanceledRequest
      ? 'Request was canceled.'
      : 'No response received from the server. Check your network connection.';
  } else {
    // Something happened in setting up the request
    normalizedError.message = error.message;
  }

  if (!isCanceledRequest) {
    console.error('[API Error Interceptor]:', {
      ...normalizedError,
      method: error.config?.method,
      url: error.config?.url,
    });
  }

  return Promise.reject(normalizedError);
};

export const responseInterceptor = (response: AxiosResponse) => {
  // Can unwrap or log the response here. 
  // We'll return the response as is for now, let the API methods unwrap it.
  return response;
};
