// src/lib/api/http-client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";
import type { ApiError } from "@/types/api";

// Constants
const MAX_QUEUE_SIZE = 100; // Prevent unbounded queue growth

class HttpClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (error?: unknown) => void;
  }> = [];

  constructor() {
    let baseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";
    // Ensure baseURL ends with /api
    if (!baseURL.endsWith("/api")) {
      baseURL = `${baseURL}/api`;
    }

    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor - Handle auth and errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Prevent unbounded queue growth
            if (this.failedQueue.length >= MAX_QUEUE_SIZE) {
              return Promise.reject(this.normalizeError(error));
            }

            // Queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => {
                return this.axiosInstance(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            await this.refreshToken();
            this.processQueue(null);
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError);
            this.handleAuthError();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other errors
        return Promise.reject(this.normalizeError(error));
      },
    );
  }

  private getStoredToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  }

  private async refreshToken(): Promise<void> {
    // SSR guard
    if (typeof window === "undefined") {
      throw new Error("Cannot refresh token during SSR");
    }

    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      let baseURL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";
      if (!baseURL.endsWith("/api")) {
        baseURL = `${baseURL}/api`;
      }

      const response = await axios.post(`${baseURL}/portal/auth/refresh`, {
        refresh_token: refreshToken,
      });

      // Laravel returns { success, message, data: { tokens: { access_token, refresh_token, ... } } }
      const tokens = response.data?.data?.tokens;
      const accessToken = tokens?.access_token;
      const newRefreshToken = tokens?.refresh_token;

      if (!accessToken) {
        throw new Error("Refresh response missing access_token");
      }

      localStorage.setItem("auth_token", accessToken);
      if (newRefreshToken) {
        localStorage.setItem("refresh_token", newRefreshToken);
      }
    } catch (error) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      throw error;
    }
  }

  private processQueue(error: unknown) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
    this.failedQueue = [];
  }

  private handleAuthError() {
    // SSR guard
    if (typeof window === "undefined") return;

    // Clear tokens
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");

    // Redirect to login
    window.location.href = "/login";
  }

  private normalizeError(error: AxiosError): ApiError {
    const response = error.response;
    const data = response?.data as Record<string, unknown> | undefined;

    return {
      message:
        (data?.message as string) ||
        error.message ||
        "An unexpected error occurred",
      errors: (data?.errors as Record<string, string[]>) || {},
      status: response?.status || 0,
      code: (data?.code as string) || error.code,
    };
  }

  // Public methods
  public setAuthToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("auth_token", token);
  }

  public clearAuthToken() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
  }

  // HTTP Methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  // File upload
  async uploadFile<T>(
    url: string,
    file: File,
    onUploadProgress?: (progress: number) => void,
  ): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.axiosInstance.post<T>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onUploadProgress(progress);
        }
      },
    });

    return response.data;
  }
}

// Create singleton instance
export const httpClient = new HttpClient();
