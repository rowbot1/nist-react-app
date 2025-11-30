/**
 * Centralized API Service
 *
 * Configures axios with base URL, authentication interceptors,
 * and error handling for the NIST compliance assessment tool.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from './logger';

// API Base URL from environment or default
// In production, use empty string for relative URLs (same origin)
// In development, default to localhost:3001
const API_BASE_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');

/**
 * Create and configure axios instance
 */
const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add authentication token and log requests
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log the request
    logger.api.request(
      config.method?.toUpperCase() || 'UNKNOWN',
      config.url || 'unknown',
      config.data
    );

    return config;
  },
  (error: AxiosError) => {
    logger.error('API', 'Request interceptor error', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for global error handling and logging
 */
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful response
    logger.api.response(
      response.config.method?.toUpperCase() || 'UNKNOWN',
      response.config.url || 'unknown',
      response.status,
      response.data
    );
    return response;
  },
  (error: AxiosError) => {
    // Log the error
    logger.api.error(
      error.config?.method?.toUpperCase() || 'UNKNOWN',
      error.config?.url || 'unknown',
      {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      }
    );

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      logger.warn('AUTH', 'Unauthorized - redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      logger.error('AUTH', 'Access forbidden', error.response.data);
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      logger.error('API', 'Server error (500)', error.response.data);
    }

    return Promise.reject(error);
  }
);

export default api;

/**
 * Type definitions for common API responses
 */

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Utility function to extract error message from API errors
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data?.message || axiosError.message || 'An unexpected error occurred';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

/**
 * Type guard to check if error is an AxiosError
 */
export const isAxiosError = (error: unknown): error is AxiosError => {
  return axios.isAxiosError(error);
};
