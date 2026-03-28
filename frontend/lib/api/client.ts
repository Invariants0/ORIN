import axios from 'axios';
import { API_URL } from '../constants';
import { authInterceptor, authErrorInterceptor } from './interceptors/auth.interceptor';
import { responseInterceptor, errorInterceptor } from './interceptors/error.interceptor';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased from 10s to 30s for MCP operations (connection + creation ~4s)
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure Request Interceptors
client.interceptors.request.use(authInterceptor, authErrorInterceptor);

// Configure Response Interceptors
client.interceptors.response.use(responseInterceptor, errorInterceptor);

export default client;
