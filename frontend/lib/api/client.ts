import axios from 'axios';
import axiosRetry from 'axios-retry';
import { API_ROOT } from '../constants';
import { authInterceptor, authErrorInterceptor } from './interceptors/auth.interceptor';
import { responseInterceptor, errorInterceptor } from './interceptors/error.interceptor';

const client = axios.create({
  baseURL: API_ROOT,
  timeout: 30000, // 30s for MCP operations
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure Advanced Retry Logic (Production Stability)
axiosRetry(client, {
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response ? error.response.status >= 500 : false);
  },
  onRetry: (retryCount, error, requestConfig) => {
    console.warn(`[Axios] Retry attempt ${retryCount} for ${requestConfig.url}`, error.message);
  }
});

// Configure Request Interceptors
client.interceptors.request.use(authInterceptor, authErrorInterceptor);

// Configure Response Interceptors
client.interceptors.response.use(responseInterceptor, errorInterceptor);

export default client;
